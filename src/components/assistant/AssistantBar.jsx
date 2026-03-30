import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BrainCircuit, GraduationCap, Sparkles, Timer } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useData } from '../../context/DataContext.jsx'
import { readAiControlCenterSettings } from '../../utils/aiControlCenter.js'
import { getAssistantSnapshot } from '../../utils/assistantEngine.ts'
import { getShortMessage } from '../../utils/aiEngine.ts'
import { computeCognitiveLoad, readCognitiveTelemetry } from '../../utils/cognitiveLoadEngine.ts'
import { getActiveFocusTaskId } from '../../utils/focusTasks.js'
import { readAutopilotState } from '../../utils/autopilotEngine.ts'
import {
  buildAssistantAiContext,
  buildAssistantDecisionFromAi,
  fetchAssistantAiRecommendation,
  resolveAssistantVoicePipeline
} from '../../utils/assistantAiEngine.ts'
import {
  buildAssistantDecision,
  buildConfirmationDecision,
  canExecuteAssistantDecision,
  executeAssistantDecision,
  getAssistantIgnoreThreshold,
  mergeAssistantDecisionMemory,
  normalizeAssistantDecisionMemory,
  persistAssistantDecisionMemory,
  readAssistantDecisionMemory,
  recordAssistantDecisionOutcome
} from '../../utils/assistantDecisionEngine.ts'
import {
  createVoiceSession,
  unlockAudioContextOnGesture,
  playAssistantSound,
  resumeAudioContext,
  startVoiceListening,
  stopVoiceListening
} from '../../utils/voiceAssistantEngine.ts'
import useAssistantIslandGestures from '../../hooks/useAssistantIslandGestures.js'
import AssistantDynamicIsland from './AssistantDynamicIsland.jsx'

const ACTIVE_SESSION_KEY = 'active_session'
const VIEW_ORDER = ['idle', 'suggestion', 'focus', 'task']
const ASSISTANT_MEMORY_SYNC_MS = 900

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const readActiveSession = () => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(ACTIVE_SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const DAY_MS = 24 * 60 * 60 * 1000

const toDayKey = (value = Date.now()) => {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10)
  return parsed.toISOString().slice(0, 10)
}

const getTaskDurationMinutes = (task, fallback = 45) => {
  const candidates = [
    task?.duration_minutes,
    task?.durationMinutes,
    task?.estimated_minutes,
    task?.estimatedMinutes,
    task?.planned_minutes,
    task?.plannedMinutes,
    task?.focus_minutes,
    task?.focusMinutes
  ]

  for (const value of candidates) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric)
  }

  return fallback
}

const formatSubjectLabel = (value) =>
  String(value || 'focus')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatDirectTaskAction = (task, mode = 'continue', fallbackMinutes = 45) => {
  const duration = getTaskDurationMinutes(task, fallbackMinutes)
  const subject = formatSubjectLabel(task?.subject)
  const title = String(task?.title || '').trim()

  if (mode === 'first') return `Start first ${subject} session • ${duration}min`
  if (mode === 'overdue') return `Finish overdue ${subject} task • ${duration}min`
  if (!title) return `Continue ${subject} session • ${duration}min`
  return `Continue ${title} • ${duration}min`
}

const getDueDayOffset = (task, now = Date.now()) => {
  if (!task?.due_date) return Number.POSITIVE_INFINITY
  const todayKey = toDayKey(now)
  const todayMs = new Date(`${todayKey}T00:00:00`).getTime()
  const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
  if (Number.isNaN(dueMs)) return Number.POSITIVE_INFINITY
  return Math.round((dueMs - todayMs) / DAY_MS)
}

const getActiveTasks = (tasks = []) =>
  tasks.filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))

const getOverdueTask = (tasks = [], now = Date.now()) =>
  getActiveTasks(tasks)
    .filter((task) => getDueDayOffset(task, now) < 0)
    .sort((a, b) => {
      const dueDelta = getDueDayOffset(a, now) - getDueDayOffset(b, now)
      if (dueDelta !== 0) return dueDelta
      const aPriority = String(a?.priority || '').toLowerCase()
      const bPriority = String(b?.priority || '').toLowerCase()
      const score = { high: 3, medium: 2, low: 1 }
      return (score[bPriority] || 0) - (score[aPriority] || 0)
    })[0] || null

const getTodayStudyMinutes = (studySessions = [], now = Date.now()) => {
  const todayKey = toDayKey(now)
  return studySessions.reduce((total, session) => {
    const dateValue =
      session?.completed_at ||
      session?.ended_at ||
      session?.created_at ||
      session?.updated_at ||
      session?.date ||
      session?.started_at

    if (!dateValue || toDayKey(dateValue) !== todayKey) return total
    return total + (Number(session?.duration_minutes ?? session?.durationMinutes ?? session?.duration ?? 0) || 0)
  }, 0)
}

const getMostRecentCompletedSession = (studySessions = [], now = Date.now()) =>
  [...studySessions]
    .map((session) => {
      const endedAt = session?.completed_at || session?.ended_at || session?.updated_at || session?.created_at || null
      const endedMs = endedAt ? new Date(endedAt).getTime() : Number.NaN
      return { session, endedMs }
    })
    .filter((entry) => Number.isFinite(entry.endedMs) && entry.endedMs <= now)
    .sort((a, b) => b.endedMs - a.endedMs)[0] || null

const buildRestRecommendationMessage = ({ tasks = [], studySessions = [], decision, now = Date.now() }) => {
  const activeTasks = getActiveTasks(tasks)
  if (!activeTasks.length) {
    return 'Add your first task • Plan today • 2min'
  }

  const todayStudyMinutes = getTodayStudyMinutes(studySessions, now)
  if (todayStudyMinutes <= 0) {
    const starterTask = decision?.task || activeTasks[0]
    return formatDirectTaskAction(starterTask, 'first', 45)
  }

  const recentSessionEntry = getMostRecentCompletedSession(studySessions, now)
  const recentMinutes = Number(
    recentSessionEntry?.session?.duration_minutes ??
      recentSessionEntry?.session?.durationMinutes ??
      recentSessionEntry?.session?.duration ??
      0
  ) || 0
  const recentAgeMs = recentSessionEntry ? now - recentSessionEntry.endedMs : Number.POSITIVE_INFINITY

  if (recentMinutes >= 25 && recentAgeMs <= 25 * 60 * 1000) {
    return 'Take a break • Reset • 5min'
  }

  const overdueTask = getOverdueTask(activeTasks, now)
  if (overdueTask) {
    return formatDirectTaskAction(overdueTask, 'overdue', 45)
  }

  const nextTask = decision?.task || activeTasks[0]
  return formatDirectTaskAction(nextTask, 'continue', 45)
}

const mapTimerState = (session, now = Date.now()) => {
  if (!session || session.phase === 'completed') return null

  const mode = session.mode === 'pomodoro' ? 'pomodoro' : 'free'
  const isRunning = Boolean(session.isRunning)
  const startTime = Number(session.startTime) || 0
  const elapsedMs = Number(session.elapsedMs) || 0
  const pomodoroMinutes = Number(session.pomodoroMinutes) || 45
  const breakMinutes = Number(session.breakMinutes) || Math.round(pomodoroMinutes / 3)
  const liveElapsed = isRunning && startTime ? elapsedMs + (now - startTime) : elapsedMs

  if (!isRunning && liveElapsed <= 0) return null

  let seconds = Math.floor(Math.max(0, liveElapsed) / 1000)
  if (mode === 'pomodoro') {
    const targetMinutes = session.phase === 'break' ? breakMinutes : pomodoroMinutes
    seconds = Math.floor(Math.max(0, targetMinutes * 60 * 1000 - liveElapsed) / 1000)
  }

  return { isRunning, seconds, formatted: formatTime(seconds), mode, phase: session.phase || 'focus' }
}

const buildIslandPages = ({ snapshot, decision, currentPath, timerState, tasks, studySessions, now }) => {
  const bestTask = decision?.task || snapshot?.metadata?.bestTask || snapshot?.recommendation?.task || snapshot?.recommendation?.bestTask || null
  const timerMessage =
    timerState?.isRunning
      ? `Focus running • ${timerState.formatted}`
      : snapshot?.autopilotActive
        ? `Autopilot running • ${Number(snapshot?.metadata?.autopilotPlan?.duration || snapshot?.suggestedDuration || 30)}min`
        : snapshot?.suggestedDuration
          ? `Start focus • ${snapshot.suggestedDuration}min`
          : 'Start focus session • 30min'

  const taskMessage = bestTask
    ? formatDirectTaskAction(bestTask, 'continue', 45)
    : 'Continue next task • 45min'

  const suggestionMessage =
    decision?.title ||
    buildRestRecommendationMessage({
      tasks,
      studySessions,
      decision,
      now
    })

  const idleMessage = timerState?.isRunning
    ? `Focus running • ${timerState.formatted}`
    : buildRestRecommendationMessage({
        tasks,
        studySessions,
        decision,
        now
      })

  const suggestionTone =
    decision?.tone ||
    (snapshot?.assistantState === 'exam' || snapshot?.assistantState === 'warning'
      ? 'warning'
      : 'suggestion')

  return [
    {
      key: 'idle',
      icon: Sparkles,
      message: idleMessage,
      status: 'READY',
      tone: 'neutral'
    },
    {
      key: 'suggestion',
      icon: BrainCircuit,
      message: suggestionMessage,
      status: decision?.status || (snapshot?.assistantState === 'exam' ? 'EXAM' : 'AI'),
      tone: suggestionTone
    },
    {
      key: 'focus',
      icon: Timer,
      message: timerMessage,
      status: snapshot?.autopilotActive ? 'AUTO' : 'FOCUS',
      tone: 'active'
    },
    {
      key: 'task',
      icon: GraduationCap,
      message: taskMessage,
      status: 'TASK',
      tone: bestTask ? 'neutral' : 'neutral'
    }
  ]
}

const resolveDefaultViewIndex = ({ snapshot, decision, currentPath }) => {
  const page = String(currentPath || '').replace(/^\//, '')

  if (snapshot?.autopilotActive || snapshot?.assistantState === 'timer') return 2
  if (decision) return 1
  if (page === 'study') return 2
  if (page === 'tasks') return 3
  if (snapshot?.assistantState === 'exam' || snapshot?.assistantState === 'warning') return 1
  return 0
}

const AssistantDebugPanel = ({
  aiContext,
  decision,
  fallbackDecision,
  aiDecision,
  memory
}) => {
  if (!import.meta.env.DEV) return null

  return (
    <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+5.5rem)] z-[70] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-white/10 bg-[rgba(8,8,12,0.94)] p-3 text-[11px] text-white/80 shadow-[0_12px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-white/90">Assistant Debug</span>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-white/55">
          {decision?.origin || 'fallback'}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <div><span className="text-white/45">active:</span> {decision?.title || 'none'}</div>
        <div><span className="text-white/45">ai:</span> {aiDecision?.title || 'none'}</div>
        <div><span className="text-white/45">fallback:</span> {fallbackDecision?.title || 'none'}</div>
        <div><span className="text-white/45">last action:</span> {memory?.lastAction?.type || 'none'}</div>
        <div><span className="text-white/45">last task:</span> {memory?.lastTaskId || 'none'}</div>
        <div><span className="text-white/45">context:</span> {JSON.stringify(aiContext?.payload || {})}</div>
      </div>
    </div>
  )
}

const AssistantBar = () => {
  const { user, profile, saveAssistantMemory } = useAuth()
  const { tasks, studySessions, addTask, updateTaskById, toggleTask, removeTask } = useData()
  const location = useLocation()
  const navigate = useNavigate()

  const [now, setNow] = useState(() => Date.now())
  const [viewIndex, setViewIndex] = useState(0)
  const [pageDirection, setPageDirection] = useState(1)
  const [statusMode, setStatusMode] = useState('idle')
  const [statusLabel, setStatusLabel] = useState('')
  const [isIslandExpanded, setIsIslandExpanded] = useState(false)
  const [decisionMemory, setDecisionMemory] = useState(() => readAssistantDecisionMemory(user?.id))
  const [pendingVoiceDecision, setPendingVoiceDecision] = useState(null)
  const [aiDecision, setAiDecision] = useState(null)
  const [aiRequestVersion, setAiRequestVersion] = useState(0)

  const statusTimerRef = useRef(null)
  const voiceSessionRef = useRef(null)
  const voiceDepsRef = useRef({})
  const interactionModeRef = useRef('idle')
  const islandRef = useRef(null)
  const expansionTimeoutRef = useRef(null)
  const visibleDecisionRef = useRef(null)
  const forceAiRefreshRef = useRef(false)
  const previousTimerRunningRef = useRef(false)
  const memorySyncTimerRef = useRef(null)
  const lastSyncedMemoryRef = useRef('')

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!user?.id) {
      setDecisionMemory(readAssistantDecisionMemory(null))
      lastSyncedMemoryRef.current = ''
      return
    }

    const localMemory = readAssistantDecisionMemory(user.id)
    const remoteMemory = normalizeAssistantDecisionMemory(profile?.assistant_memory || {})
    const mergedMemory = mergeAssistantDecisionMemory(localMemory, remoteMemory)
    persistAssistantDecisionMemory(user.id, mergedMemory)
    setDecisionMemory(mergedMemory)
  }, [user?.id, profile?.assistant_memory])

  useEffect(() => {
    if (!user?.id || !saveAssistantMemory) return undefined

    const normalizedMemory = normalizeAssistantDecisionMemory(decisionMemory)
    const serialized = JSON.stringify(normalizedMemory)
    const remoteSerialized = JSON.stringify(normalizeAssistantDecisionMemory(profile?.assistant_memory || {}))

    if (serialized === remoteSerialized || serialized === lastSyncedMemoryRef.current) {
      return undefined
    }

    if (memorySyncTimerRef.current) {
      window.clearTimeout(memorySyncTimerRef.current)
    }

    memorySyncTimerRef.current = window.setTimeout(() => {
      saveAssistantMemory(normalizedMemory)
        .then(() => {
          lastSyncedMemoryRef.current = serialized
        })
        .catch(() => {
          // Keep local memory even if remote sync fails.
        })
        .finally(() => {
          memorySyncTimerRef.current = null
        })
    }, ASSISTANT_MEMORY_SYNC_MS)

    return () => {
      if (memorySyncTimerRef.current) {
        window.clearTimeout(memorySyncTimerRef.current)
        memorySyncTimerRef.current = null
      }
    }
  }, [decisionMemory, profile?.assistant_memory, saveAssistantMemory, user?.id])

  const activeTaskId = useMemo(() => (user?.id ? getActiveFocusTaskId(user.id) : null), [user?.id])
  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) || null,
    [tasks, activeTaskId]
  )

  const assistantProfile = useMemo(() => {
    const rootProfile = profile && typeof profile === 'object' ? profile : {}
    const personalization =
      rootProfile?.personalization && typeof rootProfile.personalization === 'object'
        ? rootProfile.personalization
        : {}

    return {
      ...rootProfile,
      ...personalization
    }
  }, [profile])

  const aiControlSettings = useMemo(
    () => readAiControlCenterSettings(profile?.id || user?.id),
    [profile?.id, user?.id]
  )

  const activeSession = useMemo(() => readActiveSession(), [now])
  const timerState = useMemo(() => mapTimerState(activeSession, now), [activeSession, now])
  const cognitiveTelemetry = useMemo(() => readCognitiveTelemetry(user?.id), [user?.id, now])
  const cognitiveLoad = useMemo(
    () =>
      computeCognitiveLoad(profile?.personalization || profile || {}, {
        tasks,
        studySessions,
        timerState,
        userId: user?.id,
        cognitiveTelemetry,
        now
      }),
    [profile, tasks, studySessions, timerState, user?.id, cognitiveTelemetry, now]
  )
  const autopilotState = useMemo(() => readAutopilotState(user?.id), [user?.id])

  useEffect(() => {
    voiceDepsRef.current = {
      user,
      profile: assistantProfile,
      tasks,
      studySessions,
      addTask,
      updateTaskById,
      toggleTask,
      removeTask,
      navigate,
      memory: decisionMemory,
      cognitiveLoad
    }
  }, [user, assistantProfile, tasks, studySessions, addTask, updateTaskById, toggleTask, removeTask, navigate, decisionMemory, cognitiveLoad])

  const assistantSnapshot = useMemo(
    () =>
      getAssistantSnapshot({
        tasks,
        studySessions,
        timerState,
        activeTask,
        activeTaskId,
        cognitiveLoad,
        autopilotState,
        aiControlSettings,
        currentPage: location.pathname,
        user,
        profile,
        now
      }),
    [
      tasks,
      studySessions,
      timerState,
      activeTask,
      activeTaskId,
      cognitiveLoad,
      autopilotState,
      aiControlSettings,
      location.pathname,
      user,
      profile,
      now
    ]
  )

  const fallbackDecision = useMemo(
    () =>
      buildAssistantDecision({
        tasks,
        studySessions,
        profile: assistantProfile,
        userId: user?.id,
        currentPage: location.pathname,
        timerState,
        autopilotActive: Boolean(autopilotState?.active),
        pendingVoiceDecision: null,
        cognitiveLoad,
        memory: decisionMemory,
        now
      }),
    [
      tasks,
      studySessions,
      assistantProfile,
      user?.id,
      location.pathname,
      timerState,
      autopilotState?.active,
      cognitiveLoad,
      decisionMemory,
      now
    ]
  )

  const aiContext = useMemo(
    () =>
      buildAssistantAiContext({
        tasks,
        studySessions,
        profile: assistantProfile,
        timerState,
        memory: decisionMemory,
        currentPage: location.pathname,
        userId: user?.id,
        now
      }),
    [
      tasks,
      studySessions,
      assistantProfile,
      timerState,
      decisionMemory,
      location.pathname,
      user?.id,
      now
    ]
  )

  useEffect(() => {
    if (location.pathname === '/dashboard') {
      setAiRequestVersion((value) => value + 1)
    }
  }, [location.pathname])

  useEffect(() => {
    const wasRunning = previousTimerRunningRef.current
    const isRunning = Boolean(timerState?.isRunning)

    if (wasRunning && !isRunning) {
      setAiRequestVersion((value) => value + 1)
    }

    previousTimerRunningRef.current = isRunning
  }, [timerState?.isRunning])

  useEffect(() => {
    if (aiRequestVersion === 0) {
      return undefined
    }

    if (pendingVoiceDecision) {
      setAiDecision(null)
      return undefined
    }

    if (!aiContext?.shouldRequest) {
      setAiDecision(null)
      return undefined
    }

    const controller = new AbortController()
    const force = forceAiRefreshRef.current
    forceAiRefreshRef.current = false

    let isMounted = true

    fetchAssistantAiRecommendation({
      context: aiContext,
      signal: controller.signal,
      force
    }).then((result) => {
      if (!isMounted) return

      if (!result?.ok || !result.output) {
        setAiDecision(null)
        return
      }

      const nextDecision = buildAssistantDecisionFromAi({
        output: result.output,
        context: aiContext,
        tasks,
        origin: 'ai'
      })

      setAiDecision(nextDecision || null)
    })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [aiContext, tasks, pendingVoiceDecision, aiRequestVersion])

  const decision = pendingVoiceDecision || aiDecision || fallbackDecision

  useEffect(() => {
    if (!assistantSnapshot) return
    setViewIndex(resolveDefaultViewIndex({ snapshot: assistantSnapshot, decision, currentPath: location.pathname }))
    setPageDirection(1)
  }, [assistantSnapshot?.id, assistantSnapshot?.assistantState, location.pathname, decision?.key])

  useEffect(() => {
    const previous = visibleDecisionRef.current
    if (
      previous?.decision &&
      previous.decision.origin !== 'voice' &&
      previous.decision.key !== decision?.key &&
      !previous.handled
    ) {
      const shownFor = Date.now() - previous.startedAt
      if (shownFor >= getAssistantIgnoreThreshold() && user?.id) {
        const nextMemory = recordAssistantDecisionOutcome(user.id, previous.decision, 'ignored', Date.now())
        setDecisionMemory(nextMemory)
      }
    }

    if (decision?.key) {
      visibleDecisionRef.current = {
        decision,
        startedAt: Date.now(),
        handled: false
      }
    } else {
      visibleDecisionRef.current = null
    }
  }, [decision?.key, user?.id])

  useEffect(() => {
    if (!isIslandExpanded) return undefined

    const handlePointerDown = (event) => {
      const target = event.target
      if (!islandRef.current || islandRef.current.contains(target)) return
      stopVoiceListening(voiceSessionRef.current)
      setStatusMode('idle')
      setStatusLabel('')
      interactionModeRef.current = 'idle'
      setIsIslandExpanded(false)
    }

    if (expansionTimeoutRef.current) {
      window.clearTimeout(expansionTimeoutRef.current)
    }
    expansionTimeoutRef.current = window.setTimeout(() => {
      stopVoiceListening(voiceSessionRef.current)
      setStatusMode('idle')
      setStatusLabel('')
      interactionModeRef.current = 'idle'
      setIsIslandExpanded(false)
      expansionTimeoutRef.current = null
    }, 9500)

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      if (expansionTimeoutRef.current) {
        window.clearTimeout(expansionTimeoutRef.current)
        expansionTimeoutRef.current = null
      }
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [isIslandExpanded])

  useEffect(() => {
    interactionModeRef.current = statusMode
  }, [statusMode])

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) window.clearTimeout(statusTimerRef.current)
      if (memorySyncTimerRef.current) window.clearTimeout(memorySyncTimerRef.current)
      stopVoiceListening(voiceSessionRef.current)
    }
  }, [])

  const setInteractionStatus = useCallback((mode, label = '', duration = null) => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }

    interactionModeRef.current = mode
    setStatusMode(mode)
    setStatusLabel(label)

    if (duration != null) {
      statusTimerRef.current = window.setTimeout(() => {
        interactionModeRef.current = 'idle'
        setStatusMode('idle')
        setStatusLabel('')
        statusTimerRef.current = null
      }, duration)
    }
  }, [])

  const openIsland = useCallback(() => {
    setIsIslandExpanded(true)
    if (expansionTimeoutRef.current) {
      window.clearTimeout(expansionTimeoutRef.current)
      expansionTimeoutRef.current = null
    }
  }, [])

  const collapseIsland = useCallback(() => {
    stopVoiceListening(voiceSessionRef.current)
    interactionModeRef.current = 'idle'
    setStatusMode('idle')
    setStatusLabel('')
    setPendingVoiceDecision(null)
    setIsIslandExpanded(false)
    if (expansionTimeoutRef.current) {
      window.clearTimeout(expansionTimeoutRef.current)
      expansionTimeoutRef.current = null
    }
  }, [])

  const ensureVoiceSession = useCallback(() => {
    if (voiceSessionRef.current) return voiceSessionRef.current

    const session = createVoiceSession({
      preferredLanguage: 'mixed',
      onTranscript: () => {},
      onStateChange: (nextState) => {
        if (nextState === 'listening') {
          setInteractionStatus('listening', 'Listening')
          return
        }

        if (nextState === 'processing') {
          setInteractionStatus('processing', 'Processing')
          return
        }

        if (interactionModeRef.current === 'listening' || interactionModeRef.current === 'processing') {
          interactionModeRef.current = 'idle'
          setStatusMode('idle')
          setStatusLabel('')
        }
      },
      onListeningChange: (listening) => {
        if (listening) {
          setInteractionStatus('listening', 'Listening')
          playAssistantSound('listening')
          return
        }

        if (interactionModeRef.current === 'listening') {
          interactionModeRef.current = 'idle'
          setStatusMode('idle')
          setStatusLabel('')
        }
      },
      onFinalTranscript: async (transcript) => {
        const text = String(transcript || '').trim()
        if (!text) return

        if (import.meta.env.DEV) {
          console.log('TRANSCRIPT:', text)
        }

        setInteractionStatus('processing', 'Understanding')
        playAssistantSound('processing')
        stopVoiceListening(voiceSessionRef.current)

        try {
          const voiceContext = buildAssistantAiContext({
            tasks,
            studySessions,
            profile: assistantProfile,
            timerState,
            memory: decisionMemory,
            currentPage: location.pathname,
            userId: user?.id,
            now: Date.now()
          })

          const resolved = await resolveAssistantVoicePipeline({
            transcript: text,
            context: voiceContext,
            tasks
          })

          if (!resolved.ok || !resolved.decision) {
            playAssistantSound('error')
            setInteractionStatus('error', 'Voice unavailable', 1100)
            return
          }

          if (import.meta.env.DEV) {
            console.log('AI:', resolved.output)
          }

          const nextDecision = resolved.decision

          setPendingVoiceDecision(nextDecision)
          setViewIndex(1)
          setPageDirection(1)
          interactionModeRef.current = 'idle'
          setStatusMode('idle')
          setStatusLabel('')
          playAssistantSound('success')
        } catch {
          playAssistantSound('error')
          setInteractionStatus('error', 'Voice unavailable', 1100)
        }
      },
      onError: (message, meta) => {
        playAssistantSound('error')
        const label =
          meta?.code === 'not-allowed'
            ? 'Microphone blocked'
            : meta?.code === 'no-speech'
              ? 'No speech detected'
              : meta?.code === 'network'
                ? 'Voice network issue'
                : message || 'Voice unavailable'
        setInteractionStatus('error', label, 1400)
      }
    })

    voiceSessionRef.current = session
    return session
  }, [assistantProfile, decisionMemory, location.pathname, setInteractionStatus, tasks, studySessions, timerState, user?.id])

  const triggerAI = useCallback(async () => {
    const session = ensureVoiceSession()
    if (!session?.supported) {
      playAssistantSound('error')
      setInteractionStatus('error', 'Voice unavailable', 1100)
      return false
    }

    await resumeAudioContext()

    const started = await startVoiceListening(session, {
      continuous: false,
      silenceMs: 1900,
      preferredLanguage: 'mixed'
    })
    if (!started) {
      return false
    }

    setPendingVoiceDecision(null)
    setInteractionStatus('listening', 'Listening')
    playAssistantSound('listening')
    return true
  }, [ensureVoiceSession, setInteractionStatus])

  const actionableDecision = decision

  const handleAcceptSuggestion = useCallback(async () => {
    if (!actionableDecision) return false
    if (!canExecuteAssistantDecision(actionableDecision)) {
      return false
    }

    if (import.meta.env.DEV) {
      console.log('EXEC:', actionableDecision?.action?.kind, actionableDecision?.action)
    }

    openIsland()
    stopVoiceListening(voiceSessionRef.current)
    setInteractionStatus('executing', getShortMessage(actionableDecision.title || 'Working', 16))
    playAssistantSound('executing')
    if (visibleDecisionRef.current?.decision?.key === actionableDecision.key) {
      visibleDecisionRef.current.handled = true
    }

    try {
      const result = await executeAssistantDecision(actionableDecision, voiceDepsRef.current)
      const followUpConfirmation = buildConfirmationDecision(result)

      if (followUpConfirmation) {
        setPendingVoiceDecision(followUpConfirmation)
        setViewIndex(1)
        setPageDirection(1)
        interactionModeRef.current = 'idle'
        setStatusMode('idle')
        setStatusLabel('')
        return true
      }

      if (!result?.ok) {
        throw new Error(result?.fullMessage || result?.message || 'Action failed')
      }

      if (user?.id && actionableDecision.origin !== 'voice') {
        const nextMemory = recordAssistantDecisionOutcome(user.id, actionableDecision, 'accepted', Date.now())
        setDecisionMemory(nextMemory)
      }

      setAiDecision(null)
      setPendingVoiceDecision(null)
      if (actionableDecision.origin === 'ai') {
        setAiRequestVersion((value) => value + 1)
      }
      playAssistantSound('success')
      setInteractionStatus('success', getShortMessage(result?.message || 'Done', 16), 1000)
      return true
    } catch {
      playAssistantSound('error')
      setInteractionStatus('error', 'Error', 1100)
      return false
    }
  }, [actionableDecision, openIsland, setInteractionStatus, user?.id])

  const handleRejectSuggestion = useCallback(() => {
    if (!actionableDecision) return

    openIsland()
    stopVoiceListening(voiceSessionRef.current)

    if (visibleDecisionRef.current?.decision?.key === actionableDecision.key) {
      visibleDecisionRef.current.handled = true
    }

    if (user?.id && actionableDecision.origin !== 'voice') {
      const nextMemory = recordAssistantDecisionOutcome(user.id, actionableDecision, 'rejected', Date.now())
      setDecisionMemory(nextMemory)
    }

    if (actionableDecision.origin === 'ai') {
      setAiDecision(null)
      forceAiRefreshRef.current = true
      setAiRequestVersion((value) => value + 1)
    }

    setPendingVoiceDecision(null)
    setViewIndex(0)
    setPageDirection(-1)
    playAssistantSound('error')
    setInteractionStatus('error', 'Dismissed', 900)
  }, [actionableDecision, openIsland, setInteractionStatus, user?.id])

  const handleNextState = useCallback(() => {
    openIsland()
    stopVoiceListening(voiceSessionRef.current)
    setPageDirection(1)
    setViewIndex((prev) => (prev + 1) % VIEW_ORDER.length)
  }, [openIsland])

  const handlePreviousState = useCallback(() => {
    openIsland()
    stopVoiceListening(voiceSessionRef.current)
    setPageDirection(-1)
    setViewIndex((prev) => (prev - 1 + VIEW_ORDER.length) % VIEW_ORDER.length)
  }, [openIsland])

  const gesture = useAssistantIslandGestures({
    onGestureStart: () => {
      void unlockAudioContextOnGesture()
    },
    onHold: () => {
      openIsland()
      triggerAI()
    },
    onTap: () => {
      if (isIslandExpanded) {
        collapseIsland()
        return
      }

      openIsland()
    },
    onSwipeLeft: handleRejectSuggestion,
    onSwipeRight: handleAcceptSuggestion,
    onSwipeUp: handleNextState,
    onSwipeDown: handlePreviousState
  })

  if (!assistantSnapshot) return null

  const pages = buildIslandPages({
    snapshot: assistantSnapshot,
    decision: actionableDecision,
    currentPath: location.pathname,
    timerState,
    tasks,
    studySessions,
    now
  })
  const currentPage = pages[clamp(viewIndex, 0, pages.length - 1)] || pages[0]
  const displayStatusMode =
    statusMode === 'idle'
      ? 'idle'
      : statusMode === 'listening' ||
          statusMode === 'processing' ||
          statusMode === 'executing' ||
          statusMode === 'success' ||
          statusMode === 'error'
        ? statusMode
        : 'idle'
  const displayStatusLabel = statusLabel || currentPage?.status || 'Ready'

  return (
    <>
      <AssistantDynamicIsland
        page={currentPage}
        pageDirection={pageDirection}
        statusMode={displayStatusMode}
        statusLabel={displayStatusLabel}
        isExpanded={isIslandExpanded}
        holdProgress={gesture.holdProgress}
        isHolding={gesture.isHolding}
        gestureDirection={gesture.gestureDirection}
        dragX={gesture.dragX}
        dragY={gesture.dragY}
        gestureProps={gesture.gestureProps}
        containerRef={islandRef}
      />
      <AssistantDebugPanel
        aiContext={aiContext}
        decision={decision}
        fallbackDecision={fallbackDecision}
        aiDecision={aiDecision}
        memory={decisionMemory}
      />
    </>
  )
}

export default AssistantBar
