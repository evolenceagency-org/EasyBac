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
import { readAutopilotState, queueAutopilotLaunch } from '../../utils/autopilotEngine.ts'
import {
  createVoiceSession,
  playAssistantSound,
  processVoiceCommand,
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

const buildIslandPages = (snapshot, currentPage, dismissedSuggestionId) => {
  const bestTask = snapshot?.metadata?.bestTask || snapshot?.recommendation?.bestTask || snapshot?.recommendation || null
  const autoMinutes = Number(snapshot?.suggestedDuration || snapshot?.metadata?.autopilotPlan?.duration || 0) || 0
  const suggestionSuppressed = Boolean(dismissedSuggestionId && snapshot?.id === dismissedSuggestionId)

  const suggestionMessage = suggestionSuppressed
    ? 'Ready'
    : snapshot?.assistantState === 'exam'
      ? getShortMessage(snapshot?.desktopTitle || snapshot?.primaryMessage || 'Exam ready', 24)
      : snapshot?.assistantState === 'warning'
        ? getShortMessage(snapshot?.primaryMessage || snapshot?.desktopTitle || 'Take a break', 24)
        : getShortMessage(
            snapshot?.recommendation?.label || snapshot?.desktopTitle || snapshot?.primaryMessage || 'Suggested next step',
            24
          )

  const focusMessage = snapshot?.autopilotActive
    ? getShortMessage(`Autopilot ${autoMinutes || 30}m`, 24)
    : snapshot?.assistantState === 'timer'
      ? getShortMessage(snapshot?.primaryMessage || 'Focus now', 24)
      : snapshot?.suggestedDuration
        ? getShortMessage(`${snapshot.suggestedDuration}m focus`, 24)
        : getShortMessage('Focus now', 24)

  const taskMessage = getShortMessage(
    bestTask?.title || snapshot?.desktopTitle || snapshot?.recommendation?.label || 'Task',
    24
  )

  const idleMessage = getShortMessage(snapshot?.primaryMessage || 'Ready', 24)

  const suggestionTone =
    snapshot?.assistantState === 'exam' || snapshot?.assistantState === 'warning'
      ? 'warning'
      : 'suggestion'

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
      status:
        snapshot?.assistantState === 'exam'
          ? 'EXAM'
          : snapshot?.assistantState === 'warning'
            ? 'ALERT'
            : 'AI',
      tone: suggestionSuppressed ? 'neutral' : suggestionTone
    },
    {
      key: 'focus',
      icon: Timer,
      message: focusMessage,
      status: snapshot?.autopilotActive ? 'AUTO' : 'FOCUS',
      tone: 'active'
    },
    {
      key: 'task',
      icon: GraduationCap,
      message: taskMessage,
      status: 'TASK',
      tone: 'neutral'
    }
  ]
}

const resolveDefaultViewIndex = (snapshot, currentPage) => {
  const page = String(currentPage || '').replace(/^\//, '')

  if (page === 'study') return 2
  if (page === 'tasks') return 3
  if (page === 'analytics') return snapshot?.assistantState === 'idle' ? 0 : 1

  if (snapshot?.autopilotActive || snapshot?.assistantState === 'timer') return 2
  if (snapshot?.assistantState === 'exam' || snapshot?.assistantState === 'warning') return 1
  if (snapshot?.assistantState === 'suggesting') return 1
  if (snapshot?.recommendation?.label || snapshot?.metadata?.bestTask?.id) return 1

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
  const [dismissedSuggestionId, setDismissedSuggestionId] = useState(null)

  const statusTimerRef = useRef(null)
  const voiceSessionRef = useRef(null)
  const voiceDepsRef = useRef({})
  const interactionModeRef = useRef('idle')

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

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

  const aiControlSettings = useMemo(
    () => readAiControlCenterSettings(profile?.id || user?.id),
    [profile?.id, user?.id]
  )

  const activeSession = useMemo(() => readActiveSession(), [now])
  const timerState = useMemo(() => mapTimerState(activeSession, now), [activeSession, now])
  const cognitiveTelemetry = useMemo(
    () => readCognitiveTelemetry(user?.id),
    [user?.id, now]
  )
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

  useEffect(() => {
    if (!assistantSnapshot) return
    setViewIndex(resolveDefaultViewIndex(assistantSnapshot, location.pathname))
    setPageDirection(1)
    setDismissedSuggestionId(null)
  }, [assistantSnapshot?.id, assistantSnapshot?.assistantState, location.pathname])

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

        setInteractionStatus('processing', 'Processing')
        playAssistantSound('processing')
        stopVoiceListening(voiceSessionRef.current)

        try {
          const { result } = await processVoiceCommand(text, voiceDepsRef.current)
          const normalizedLabel = getShortMessage(result?.message || result?.fullMessage || 'Done', 16)

          if (result?.status === 'confirmation') {
            playAssistantSound('executing')
            setInteractionStatus('executing', normalizedLabel || 'Working', 1400)
            return
          }

          if (result?.ok) {
            playAssistantSound('success')
            setInteractionStatus('success', normalizedLabel || 'Done', 1100)
            return
          }

          playAssistantSound('error')
          setInteractionStatus('error', normalizedLabel || 'Error', 1100)
        } catch {
          playAssistantSound('error')
          setInteractionStatus('error', 'Error', 1100)
        }
      },
      onError: () => {
        playAssistantSound('error')
        setInteractionStatus('error', 'Voice unavailable', 1100)
      }
    })

    voiceSessionRef.current = session
    return session
  }, [setInteractionStatus])

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

    setInteractionStatus('listening', 'Listening')
    playAssistantSound('listening')
    return true
  }, [ensureVoiceSession, setInteractionStatus])

  const runAssistantAction = useCallback(
    async (action) => {
      if (!action) return false

      if (action.kind === 'voice' || action.kind === 'text') {
        return triggerAI()
      }

      if (action.kind === 'navigate') {
        navigate(action.path || '/dashboard', action.state ? { state: action.state } : undefined)
        return true
      }

      if (action.kind === 'autopilot') {
        const plan = action.state || action.plan
        if (!plan) return false

        const payload = queueAutopilotLaunch({
          userId: user?.id,
          plan
        })

        navigate('/study', {
          state: {
            ...payload,
            autopilot: true
          }
        })
        return true
      }

      if (action.kind === 'exam') {
        navigate(action.path || '/exam-simulation', {
          state: action.state || undefined
        })
        return true
      }

      if (action.path) {
        navigate(action.path, action.state ? { state: action.state } : undefined)
        return true
      }

      return false
    },
    [navigate, triggerAI, user?.id]
  )

  const pages = useMemo(
    () => buildIslandPages(assistantSnapshot, location.pathname, dismissedSuggestionId),
    [assistantSnapshot, location.pathname, dismissedSuggestionId]
  )

  const currentPage = pages[clamp(viewIndex, 0, pages.length - 1)] || pages[0]
  const displayStatusMode =
    statusMode === 'idle' ? 'idle' : statusMode === 'listening' || statusMode === 'processing' || statusMode === 'executing' || statusMode === 'success' || statusMode === 'error'
      ? statusMode
      : 'idle'
  const displayStatusLabel = statusLabel || currentPage?.status || 'Ready'

  const handleAcceptSuggestion = useCallback(async () => {
    const action = assistantSnapshot?.quickActions?.[0]
    if (!action) return false

    stopVoiceListening(voiceSessionRef.current)
    setInteractionStatus('executing', action.label || 'Working')
    playAssistantSound('executing')

    try {
      const success = await runAssistantAction(action)
      if (success === false) throw new Error('Action failed')
      playAssistantSound('success')
      setInteractionStatus('success', getShortMessage(action.label || 'Accepted', 16), 900)
      return true
    } catch {
      playAssistantSound('error')
      setInteractionStatus('error', 'Error', 1100)
      return false
    }
  }, [assistantSnapshot, runAssistantAction, setInteractionStatus])

  const handleRejectSuggestion = useCallback(() => {
    stopVoiceListening(voiceSessionRef.current)
    if (assistantSnapshot?.id) {
      setDismissedSuggestionId(assistantSnapshot.id)
    }
    setViewIndex(0)
    setPageDirection(-1)
    playAssistantSound('error')
    setInteractionStatus('error', 'Dismissed', 900)
  }, [assistantSnapshot?.id, setInteractionStatus])

  const handleNextState = useCallback(() => {
    stopVoiceListening(voiceSessionRef.current)
    setPageDirection(1)
    setViewIndex((prev) => (prev + 1) % VIEW_ORDER.length)
  }, [])

  const handlePreviousState = useCallback(() => {
    stopVoiceListening(voiceSessionRef.current)
    setPageDirection(-1)
    setViewIndex((prev) => (prev - 1 + VIEW_ORDER.length) % VIEW_ORDER.length)
  }, [])

  const gesture = useAssistantIslandGestures({
    onHold: triggerAI,
    onSwipeLeft: handleRejectSuggestion,
    onSwipeRight: handleAcceptSuggestion,
    onSwipeUp: handleNextState,
    onSwipeDown: handlePreviousState
  })

  if (!assistantSnapshot) return null

  return (
    <AssistantDynamicIsland
      page={currentPage}
      pageDirection={pageDirection}
      statusMode={displayStatusMode}
      statusLabel={displayStatusLabel}
      holdProgress={gesture.holdProgress}
      isHolding={gesture.isHolding}
      gestureDirection={gesture.gestureDirection}
      gestureProps={gesture.gestureProps}
    />
  )
}

export default AssistantBar
