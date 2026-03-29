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
  buildAssistantDecision,
  buildConfirmationDecision,
  executeAssistantDecision,
  getAssistantIgnoreThreshold,
  readAssistantDecisionMemory,
  recordAssistantDecisionOutcome,
  resolveVoiceDecision
} from '../../utils/assistantDecisionEngine.ts'
import {
  createVoiceSession,
  playAssistantSound,
  startVoiceListening,
  stopVoiceListening
} from '../../utils/voiceAssistantEngine.ts'
import useAssistantIslandGestures from '../../hooks/useAssistantIslandGestures.js'
import AssistantDynamicIsland from './AssistantDynamicIsland.jsx'

const ACTIVE_SESSION_KEY = 'active_session'
const VIEW_ORDER = ['idle', 'suggestion', 'focus', 'task']

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

const buildIslandPages = ({ snapshot, decision, currentPath }) => {
  const bestTask = decision?.task || snapshot?.metadata?.bestTask || snapshot?.recommendation?.task || snapshot?.recommendation?.bestTask || null
  const timerMessage =
    snapshot?.autopilotActive
      ? getShortMessage(`Autopilot ${Number(snapshot?.metadata?.autopilotPlan?.duration || snapshot?.suggestedDuration || 30)}m`, 24)
      : snapshot?.assistantState === 'timer'
        ? getShortMessage(snapshot?.primaryMessage || 'Focus active', 24)
        : snapshot?.suggestedDuration
          ? getShortMessage(`${snapshot.suggestedDuration}m focus`, 24)
          : 'Focus now'

  const taskMessage = getShortMessage(
    bestTask?.title || snapshot?.desktopTitle || snapshot?.primaryMessage || 'Task',
    24
  )

  const suggestionMessage = getShortMessage(
    decision?.shortMessage || snapshot?.desktopTitle || snapshot?.primaryMessage || 'Suggested next step',
    24
  )

  const idleMessage = getShortMessage(snapshot?.primaryMessage || 'Ready', 24)

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

  if (decision) return 1
  if (page === 'study') return 2
  if (page === 'tasks') return 3
  if (snapshot?.autopilotActive || snapshot?.assistantState === 'timer') return 2
  if (snapshot?.assistantState === 'exam' || snapshot?.assistantState === 'warning') return 1
  return 0
}

const AssistantBar = () => {
  const { user, profile } = useAuth()
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

  const statusTimerRef = useRef(null)
  const voiceSessionRef = useRef(null)
  const voiceDepsRef = useRef({})
  const interactionModeRef = useRef('idle')
  const islandRef = useRef(null)
  const expansionTimeoutRef = useRef(null)
  const visibleDecisionRef = useRef(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    setDecisionMemory(readAssistantDecisionMemory(user?.id))
  }, [user?.id])

  useEffect(() => {
    voiceDepsRef.current = {
      user,
      tasks,
      studySessions,
      addTask,
      updateTaskById,
      toggleTask,
      removeTask,
      navigate
    }
  }, [user, tasks, studySessions, addTask, updateTaskById, toggleTask, removeTask, navigate])

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

  const decision = useMemo(
    () =>
      buildAssistantDecision({
        tasks,
        studySessions,
        profile: assistantProfile,
        userId: user?.id,
        currentPage: location.pathname,
        timerState,
        autopilotActive: Boolean(autopilotState?.active),
        pendingVoiceDecision,
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
      pendingVoiceDecision,
      cognitiveLoad,
      decisionMemory,
      now
    ]
  )

  useEffect(() => {
    if (!assistantSnapshot) return
    setViewIndex(resolveDefaultViewIndex({ snapshot: assistantSnapshot, decision, currentPath: location.pathname }))
    setPageDirection(1)
  }, [assistantSnapshot?.id, assistantSnapshot?.assistantState, location.pathname, decision?.key])

  useEffect(() => {
    const previous = visibleDecisionRef.current
    if (
      previous?.decision &&
      previous.decision.origin === 'engine' &&
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
      onTranscript: () => {},
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

        setInteractionStatus('processing', 'Understanding')
        playAssistantSound('processing')
        stopVoiceListening(voiceSessionRef.current)

        try {
          const resolved = resolveVoiceDecision({
            transcript: text,
            tasks,
            studySessions,
            profile: assistantProfile,
            user,
            now: Date.now()
          })

          if (!resolved.ok || !resolved.decision) {
            playAssistantSound('error')
            setInteractionStatus('error', getShortMessage(resolved.message || 'Try again', 16), 1100)
            return
          }

          setPendingVoiceDecision(resolved.decision)
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
      onError: () => {
        playAssistantSound('error')
        setInteractionStatus('error', 'Voice unavailable', 1100)
      }
    })

    voiceSessionRef.current = session
    return session
  }, [assistantProfile, setInteractionStatus, tasks, studySessions, user])

  const triggerAI = useCallback(() => {
    const session = ensureVoiceSession()
    if (!session?.supported) {
      playAssistantSound('error')
      setInteractionStatus('error', 'Voice unavailable', 1100)
      return false
    }

    const started = startVoiceListening(session, { continuous: true, silenceMs: 1900 })
    if (!started) {
      playAssistantSound('error')
      setInteractionStatus('error', 'Voice blocked', 1100)
      return false
    }

    setPendingVoiceDecision(null)
    setInteractionStatus('listening', 'Listening')
    playAssistantSound('listening')
    return true
  }, [ensureVoiceSession, setInteractionStatus])

  const actionableDecision = pendingVoiceDecision || decision

  const handleAcceptSuggestion = useCallback(async () => {
    if (!actionableDecision) return false

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

      if (user?.id && actionableDecision.origin === 'engine') {
        const nextMemory = recordAssistantDecisionOutcome(user.id, actionableDecision, 'accepted', Date.now())
        setDecisionMemory(nextMemory)
      }

      setPendingVoiceDecision(null)
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

    if (user?.id && actionableDecision.origin === 'engine') {
      const nextMemory = recordAssistantDecisionOutcome(user.id, actionableDecision, 'rejected', Date.now())
      setDecisionMemory(nextMemory)
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
    currentPath: location.pathname
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
  )
}

export default AssistantBar
