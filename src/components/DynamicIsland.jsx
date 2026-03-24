import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AudioLines,
  BrainCircuit,
  CheckCircle2,
  CircleAlert,
  GraduationCap,
  Keyboard,
  ListChecks,
  LoaderCircle,
  Mic,
  Sparkles,
  Timer,
  X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { getIslandState } from '../utils/assistantBar.js'
import { getShortMessage } from '../utils/aiEngine.ts'
import { getActiveFocusTaskId } from '../utils/focusTasks.js'
import {
  buildAssistantPreview,
  createVoiceSession,
  detectIntent,
  executeIntent,
  playAssistantSound,
  startVoiceListening,
  stopVoiceListening
} from '../utils/voiceAssistantEngine.ts'
import { queueAutopilotLaunch } from '../utils/autopilotEngine.ts'

const ACTIVE_SESSION_KEY = 'active_session'
const HIDE_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/verify',
  '/verified',
  '/personalization',
  '/choose-plan',
  '/ai-result',
  '/welcome-ai',
  '/exam-simulation',
  '/exam-result'
])
const DESKTOP_AUTO_COLLAPSE_MS = 4200
const ASSISTANT_RESULT_AUTO_CLOSE_MS = 3600
const PULSE_STATES = new Set(['timer_active', 'task_overdue', 'task_reminder'])
const SOFT_SPRING = {
  type: 'spring',
  stiffness: 220,
  damping: 24,
  mass: 0.8
}

const iconMap = {
  alert: CircleAlert,
  brain: BrainCircuit,
  list: ListChecks,
  sparkles: Sparkles,
  timer: Timer
}

const toneClasses = {
  active: {
    icon: 'text-cyan-300',
    ring: 'ring-1 ring-cyan-400/25',
    surface: 'from-cyan-500/14 via-cyan-400/8 to-white/0',
    button: 'border-cyan-400/35 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20'
  },
  danger: {
    icon: 'text-rose-300',
    ring: 'ring-1 ring-rose-400/25',
    surface: 'from-rose-500/14 via-rose-400/8 to-white/0',
    button: 'border-rose-400/35 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20'
  },
  info: {
    icon: 'text-violet-300',
    ring: 'ring-1 ring-violet-400/25',
    surface: 'from-violet-500/14 via-blue-400/8 to-white/0',
    button: 'border-violet-400/35 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20'
  },
  success: {
    icon: 'text-emerald-300',
    ring: 'ring-1 ring-emerald-400/25',
    surface: 'from-emerald-500/14 via-emerald-400/8 to-white/0',
    button: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
  },
  warning: {
    icon: 'text-amber-300',
    ring: 'ring-1 ring-amber-400/25',
    surface: 'from-amber-500/14 via-amber-400/8 to-white/0',
    button: 'border-amber-400/35 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20'
  },
  neutral: {
    icon: 'text-white/80',
    ring: 'ring-1 ring-white/10',
    surface: 'from-white/10 via-white/5 to-white/0',
    button: 'border-white/15 bg-white/10 text-white hover:bg-white/20'
  }
}

const cognitiveIndicatorClasses = {
  flow: 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.55)]',
  normal: 'bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.45)]',
  struggling: 'bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]',
  overloaded: 'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.55)]',
  disengaged: 'bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.5)]'
}

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

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

  return {
    isRunning,
    seconds,
    formatted: formatTime(seconds)
  }
}

const MobileIsland = ({ snapshot, tone, Icon, onTap, onVoiceStart }) => {
  const pulse = PULSE_STATES.has(snapshot.id)
  const cognitiveState = snapshot.metadata?.cognitiveLoad?.state || null
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown = () => {
    longPressTriggeredRef.current = false
    clearLongPress()
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      onVoiceStart?.()
    }, 420)
  }

  const handlePointerUp = () => {
    clearLongPress()
  }

  useEffect(() => {
    return () => clearLongPress()
  }, [])

  return (
    <motion.div
      initial={{ y: -40, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -40, opacity: 0, scale: 0.9 }}
      transition={SOFT_SPRING}
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.55rem)] z-50 flex justify-center px-4 md:hidden"
    >
      <motion.button
        type="button"
        layout
        initial={{ y: -20, opacity: 0, scale: 0.94 }}
        animate={
          pulse
            ? { y: 0, opacity: 1, scale: [1, 1.012, 1] }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={{
          ...SOFT_SPRING,
          scale: {
            duration: 2.4,
            repeat: pulse ? Infinity : 0,
            ease: 'easeInOut'
          }
        }}
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false
            return
          }
          onTap()
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`pointer-events-auto group relative flex h-[40px] min-w-[132px] max-w-[78vw] items-center overflow-hidden rounded-full border border-white/10 bg-black/72 px-4 shadow-[0_10px_28px_rgba(0,0,0,0.56)] backdrop-blur-2xl ${tone.ring}`}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-80 ${tone.surface}`} />
        <motion.div layout className="relative flex min-w-0 items-center gap-2">
          {cognitiveState ? (
            <span
              className={`h-2 w-2 rounded-full ${cognitiveIndicatorClasses[cognitiveState] || cognitiveIndicatorClasses.normal}`}
            />
          ) : null}
          <Icon className={`h-3.5 w-3.5 shrink-0 ${tone.icon}`} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={snapshot.mobileText}
              initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="truncate text-xs font-medium leading-tight text-white"
            >
              {snapshot.mobileText}
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </motion.button>
    </motion.div>
  )
}

const DesktopAssistant = ({
  snapshot,
  tone,
  Icon,
  onAction,
  onExamTap,
  showExamAction,
  onVoiceTap,
  onVoiceStop,
  onTextTap,
  voiceSupported,
  assistantMode
}) => {
  const [expanded, setExpanded] = useState(false)
  const cognitiveState = snapshot.metadata?.cognitiveLoad?.state || null

  useEffect(() => {
    if (snapshot.id === 'idle') return undefined

    setExpanded(true)

    if (snapshot.id === 'timer_active') return undefined

    const timeout = window.setTimeout(() => setExpanded(false), DESKTOP_AUTO_COLLAPSE_MS)
    return () => window.clearTimeout(timeout)
  }, [snapshot.id])

  const pulse = PULSE_STATES.has(snapshot.id)

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={SOFT_SPRING}
      className="pointer-events-none fixed bottom-7 left-0 right-0 z-40 hidden justify-center pl-60 pr-6 md:flex"
    >
      <motion.div
        layout
        initial={{ y: 40, opacity: 0, scale: 0.97 }}
        animate={
          pulse
            ? { y: 0, opacity: 1, scale: [1, 1.008, 1] }
            : { y: 0, opacity: 1, scale: 1 }
        }
        transition={{
          ...SOFT_SPRING,
          scale: {
            duration: 3.2,
            repeat: pulse ? Infinity : 0,
            ease: 'easeInOut'
          }
        }}
        className={`pointer-events-auto relative w-full max-w-[min(34rem,calc(100vw-22rem))] overflow-hidden rounded-[22px] border border-white/10 bg-black/62 shadow-[0_18px_48px_rgba(0,0,0,0.46)] backdrop-blur-2xl ${tone.ring}`}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-85 ${tone.surface}`} />

        <div className="relative flex w-full items-center gap-3 px-5 py-3.5">
          <motion.div
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setExpanded((value) => !value)
              }
            }}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left outline-none"
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ${tone.icon}`}
            >
              <Icon className="h-4 w-4" />
            </div>

            <AnimatePresence mode="wait" initial={false}>
            <motion.div
                key={`${snapshot.id}-${expanded ? 'open' : 'closed'}`}
                initial={{ opacity: 0, y: 6, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -6, filter: 'blur(6px)' }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold text-white">{snapshot.desktopTitle}</p>
                <p className="truncate text-xs text-white/62">
                  {snapshot.mobileExpandedText || snapshot.mobileText}
                </p>
                {cognitiveState ? (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white/55">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        cognitiveIndicatorClasses[cognitiveState] || cognitiveIndicatorClasses.normal
                      }`}
                    />
                    {cognitiveState}
                  </span>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (assistantMode === 'listening') {
                  onVoiceStop?.()
                  return
                }
                if (voiceSupported) onVoiceTap?.()
                else onTextTap?.()
              }}
              className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/15"
              aria-label={voiceSupported ? 'Start voice assistant' : 'Open assistant input'}
            >
              {assistantMode === 'listening' ? (
                <AudioLines className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onTextTap}
              className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80 transition hover:bg-white/15"
              aria-label="Open assistant text input"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>
            {snapshot.mobileText ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {snapshot.mobileText}
              </span>
            ) : null}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="assistant-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 170, damping: 22, mass: 0.82 }}
              className="relative overflow-hidden border-t border-white/10"
            >
              <div className="px-5 pb-4 pt-3">
                <p className="text-sm leading-6 text-white/78">{snapshot.desktopDetail}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onAction}
                    className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition duration-200 hover:scale-[1.02] ${tone.button}`}
                  >
                    {snapshot.actionLabel}
                  </button>
                  {showExamAction ? (
                    <button
                      type="button"
                      onClick={onExamTap}
                      className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                    >
                      <GraduationCap className="h-3.5 w-3.5" />
                      Start Exam Simulation
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={voiceSupported ? onVoiceTap : onTextTap}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/15"
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {voiceSupported ? 'Voice' : 'Type'}
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

const ListeningWaveform = () => (
  <div className="flex items-end gap-1">
    {[0, 1, 2, 3, 4].map((index) => (
      <motion.span
        // eslint-disable-next-line react/no-array-index-key
        key={index}
        className="block w-1 rounded-full bg-cyan-300/90"
        animate={{
          height: [8, 18 + (index % 2) * 6, 10 + (index % 3) * 4, 8],
          opacity: [0.55, 1, 0.7, 0.55]
        }}
        transition={{
          duration: 0.85,
          repeat: Infinity,
          repeatType: 'mirror',
          delay: index * 0.08,
          ease: 'easeInOut'
        }}
      />
    ))}
  </div>
)

const AssistantCommandPanel = ({
  open,
  mode,
  transcript,
  preview,
  result,
  pendingConfirmation,
  textEntryOpen,
  textValue,
  setTextValue,
  onSubmitText,
  onConfirmIntent,
  onCancelConfirmation,
  onClose,
  onStopListening,
  voiceSupported
}) => {
  const panelLabel =
    mode === 'listening'
      ? 'Listening...'
      : mode === 'processing'
        ? 'Processing...'
        : mode === 'executing'
          ? 'Executing...'
          : mode === 'success'
            ? 'Done'
            : mode === 'error'
              ? 'Something went wrong'
              : mode === 'confirm'
                ? 'Confirm action'
                : textEntryOpen
                  ? 'Type a command'
                  : 'Assistant update'

  return (
    <AnimatePresence>
    {open ? (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="pointer-events-auto fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[60] px-4 md:inset-x-auto md:bottom-28 md:left-1/2 md:top-auto md:w-[28rem] md:-translate-x-1/2 md:px-0"
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/82 shadow-[0_18px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                AI Assistant
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{panelLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {mode === 'listening' ? (
                <button
                  type="button"
                  onClick={onStopListening}
                  className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80"
                >
                  <AudioLines className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/10 p-2 text-white/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4">
            {mode === 'listening' ? (
              <div className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-50">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/60">
                    Listening
                  </p>
                  <p className="mt-1 text-sm text-white/85">
                    Speak naturally in English, French, Arabic, or mix them.
                  </p>
                </div>
                <ListeningWaveform />
              </div>
            ) : null}

            {mode === 'processing' || mode === 'executing' ? (
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white/80">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                <span>
                  {mode === 'processing'
                    ? 'Understanding your command...'
                    : 'Executing your action...'}
                </span>
              </div>
            ) : null}

            {(mode === 'listening' || transcript) && !textEntryOpen ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">Live transcript</p>
                <p className="mt-2 text-sm text-white/85">
                  {transcript ||
                    'Try "start focus math", "bda session dial 45 minutes", or "supprime les taches en retard".'}
                </p>
              </div>
            ) : null}

            {preview ? (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/70">Preview</p>
                <p className="mt-2 text-sm font-semibold text-white">{preview.title}</p>
                <p className="mt-1 text-xs text-white/65">
                  {preview.subject} - {preview.dueDate}
                </p>
              </div>
            ) : null}

            {textEntryOpen ? (
              <form
                onSubmit={onSubmitText}
                className="rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <input
                  type="text"
                  value={textValue}
                  onChange={(event) => setTextValue(event.target.value)}
                  placeholder={
                    voiceSupported
                      ? 'Type a command if voice misses it'
                      : 'Voice unavailable. Type a command...'
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-cyan-400/30"
                />
                <button
                  type="submit"
                  className="mt-3 inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100"
                >
                  Run command
                </button>
              </form>
            ) : null}

            {result ? (
              <div
                className={`rounded-2xl border px-3 py-3 ${
                  result.status === 'error'
                    ? 'border-rose-400/20 bg-rose-500/10'
                    : result.status === 'confirmation'
                      ? 'border-amber-400/20 bg-amber-500/10'
                      : 'border-emerald-400/20 bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      result.status === 'error'
                        ? 'text-rose-300'
                        : result.status === 'confirmation'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  />
                  <p className="text-sm font-semibold text-white">{result.message}</p>
                </div>
                <p className="mt-2 text-sm text-white/72">{result.fullMessage}</p>
                {pendingConfirmation ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onConfirmIntent}
                      className="rounded-full border border-amber-400/25 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={onCancelConfirmation}
                      className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white/85"
                    >
                      Cancel
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    ) : null}
    </AnimatePresence>
  )
}

const DynamicIsland = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { tasks, studySessions, addTask, updateTaskById, toggleTask, removeTask } = useData()
  const [timerState, setTimerState] = useState(() => mapTimerState(readActiveSession()))
  const [activeTaskId, setActiveTaskId] = useState(() => getActiveFocusTaskId(user?.id))
  const [transientEvent, setTransientEvent] = useState(null)
  const [focusModeActive, setFocusModeActive] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  )
  const [assistantMode, setAssistantMode] = useState('idle')
  const [assistantTranscript, setAssistantTranscript] = useState('')
  const [assistantPreview, setAssistantPreview] = useState(null)
  const [assistantResult, setAssistantResult] = useState(null)
  const [pendingConfirmationIntent, setPendingConfirmationIntent] = useState(null)
  const [textEntryOpen, setTextEntryOpen] = useState(false)
  const [textCommand, setTextCommand] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const previousCompletedRef = useRef(0)
  const previousRunningRef = useRef(false)
  const previousScoreDateRef = useRef('')
  const voiceSessionRef = useRef(null)

  useEffect(() => {
    const syncTimer = () => {
      setTimerState(mapTimerState(readActiveSession()))
      setActiveTaskId(getActiveFocusTaskId(user?.id))
    }

    syncTimer()
    const interval = window.setInterval(syncTimer, 1000)
    const handleStorage = (event) => {
      if (event.key === ACTIVE_SESSION_KEY) {
        syncTimer()
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('storage', handleStorage)
    }
  }, [user?.id])

  useEffect(() => {
    const completed = tasks.filter(
      (task) => task?.completed === true || task?.status === 'completed'
    ).length

    if (previousCompletedRef.current !== 0 && completed > previousCompletedRef.current) {
      setTransientEvent({ type: 'task_completed', timestamp: Date.now() })
    }

    previousCompletedRef.current = completed
  }, [tasks])

  useEffect(() => {
    const isRunning = Boolean(timerState?.isRunning)

    if (!previousRunningRef.current && isRunning) {
      setTransientEvent({ type: 'timer_started', timestamp: Date.now() })
    }

    if (previousRunningRef.current && !isRunning) {
      setTransientEvent({ type: 'timer_paused', timestamp: Date.now() })
    }

    previousRunningRef.current = isRunning
  }, [timerState?.isRunning])

  useEffect(() => {
    const scoreDate = profile?.personalization?.ai?.lastUpdated || ''

    if (
      previousScoreDateRef.current &&
      scoreDate &&
      scoreDate !== previousScoreDateRef.current
    ) {
      setTransientEvent({ type: 'score_updated', timestamp: Date.now() })
    }

    previousScoreDateRef.current = scoreDate
  }, [profile?.personalization?.ai?.lastUpdated])

  useEffect(() => {
    if (!transientEvent) return undefined
    const timeout = window.setTimeout(() => setTransientEvent(null), 3200)
    return () => window.clearTimeout(timeout)
  }, [transientEvent])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFocusModeActive(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const assistantUser = useMemo(
    () => ({
      id: user?.id,
      personalization: profile?.personalization || profile || {}
    }),
    [profile, user?.id]
  )

  const closeAssistantPanel = useCallback(() => {
    setAssistantMode('idle')
    setAssistantTranscript('')
    setAssistantPreview(null)
    setAssistantResult(null)
    setPendingConfirmationIntent(null)
    setTextEntryOpen(false)
    setTextCommand('')
    stopVoiceListening(voiceSessionRef.current)
  }, [])

  const runAssistantCommand = useCallback(
    async (transcript, confirmedIntent = null) => {
      if (!transcript?.trim()) return
      const spokenTranscript = confirmedIntent ? assistantTranscript || transcript.trim() : transcript.trim()
      setAssistantMode('processing')
      setAssistantTranscript(spokenTranscript)
      setAssistantPreview(buildAssistantPreview(spokenTranscript))
      setPendingConfirmationIntent(null)
      setTextEntryOpen(false)
      setTextCommand('')
      playAssistantSound('processing')

      try {
        const intent = confirmedIntent || detectIntent(transcript)
        await new Promise((resolve) => window.setTimeout(resolve, 140))
        setAssistantMode('executing')
        playAssistantSound('executing')

        const result = await executeIntent(intent, {
          user: assistantUser,
          tasks,
          addTask,
          updateTaskById,
          toggleTask,
          removeTask,
          navigate
        })

        setAssistantResult(result)
        if (result.requiresConfirmation) {
          setPendingConfirmationIntent(result.confirmIntent || intent)
          setAssistantMode('confirm')
          return
        }

        setAssistantMode(result.ok ? 'success' : 'error')
        playAssistantSound(result.ok ? 'success' : 'error')
        setAssistantResult(result)
      } catch {
        setAssistantResult({
          status: 'error',
          message: 'Command failed',
          fullMessage: 'I could not finish that action. Please try again.'
        })
        setAssistantMode('error')
        playAssistantSound('error')
      }
    },
    [addTask, assistantTranscript, assistantUser, navigate, removeTask, tasks, toggleTask, updateTaskById]
  )

  useEffect(() => {
    const nextVoiceSession = createVoiceSession({
      onTranscript: (transcript) => {
        setAssistantMode('listening')
        setAssistantTranscript(transcript)
        setAssistantPreview(buildAssistantPreview(transcript))
      },
      onFinalTranscript: (transcript) => {
        void runAssistantCommand(transcript)
      },
      onListeningChange: (isListening) => {
        setAssistantMode((prev) => {
          if (isListening) return 'listening'
          return ['processing', 'executing', 'success', 'error', 'confirm'].includes(prev)
            ? prev
            : 'idle'
        })
      },
      onError: () => {
        setTextEntryOpen(true)
        setAssistantMode('error')
        setAssistantResult({
          status: 'error',
          message: 'Voice unavailable',
          fullMessage: 'Use the text command input to control tasks and focus.'
        })
        playAssistantSound('error')
      }
    })
    voiceSessionRef.current = nextVoiceSession
    setVoiceSupported(Boolean(nextVoiceSession.supported))

    return () => {
      voiceSessionRef.current?.stopListening?.()
    }
  }, [runAssistantCommand])

  const startVoiceAssistant = useCallback(() => {
    setAssistantResult(null)
    setPendingConfirmationIntent(null)
    setTextEntryOpen(false)
    if (!voiceSessionRef.current?.supported) {
      setAssistantMode('error')
      setAssistantResult({
        status: 'error',
        message: 'Type instead',
        fullMessage: 'Voice is not supported here. Type a command instead.'
      })
      setTextEntryOpen(true)
      playAssistantSound('error')
      return
    }

    setAssistantTranscript('')
    setAssistantPreview(null)
    setAssistantMode('listening')
    playAssistantSound('listening')
    startVoiceListening(voiceSessionRef.current, {
      continuous: true,
      silenceMs: 1900
    })
  }, [])

  const stopVoiceAssistant = useCallback(() => {
    stopVoiceListening(voiceSessionRef.current)
    setAssistantMode((prev) => (['processing', 'executing'].includes(prev) ? prev : 'idle'))
  }, [])

  useEffect(() => {
    if (!['success', 'error'].includes(assistantMode)) return undefined
    const timer = window.setTimeout(() => {
      setAssistantMode('idle')
      setAssistantPreview(null)
      setAssistantTranscript('')
      setAssistantResult(null)
      setPendingConfirmationIntent(null)
    }, ASSISTANT_RESULT_AUTO_CLOSE_MS)
    return () => window.clearTimeout(timer)
  }, [assistantMode])

  const snapshot = useMemo(
    () =>
      getIslandState({
        profile,
        tasks,
        studySessions,
        timerState,
        transientEvent,
        pathname: location.pathname,
        activeTaskId
      }),
    [profile, tasks, studySessions, timerState, transientEvent, location.pathname, activeTaskId]
  )

  const displaySnapshot = useMemo(() => {
    if (assistantMode === 'listening') {
      return {
        ...snapshot,
        id: 'assistant-listening',
        mobileText: getShortMessage(assistantTranscript || 'Listening', 20),
        mobileExpandedText: getShortMessage(assistantTranscript || 'Listening...', 24),
        desktopTitle: 'Listening...',
        desktopDetail:
          assistantTranscript ||
          'Speak naturally. Example: create task math tomorrow, cree tache philo demain, or zid task math ghdda.',
        actionLabel: 'Stop',
        actionPath: snapshot.actionPath,
        icon: 'brain',
        tone: 'active'
      }
    }

    if (assistantMode === 'processing') {
      return {
        ...snapshot,
        id: 'assistant-processing',
        mobileText: 'Processing',
        mobileExpandedText: 'Processing command',
        desktopTitle: 'Processing...',
        desktopDetail: 'Understanding your command and executing the best action.',
        actionLabel: 'Wait',
        actionPath: snapshot.actionPath,
        icon: 'brain',
        tone: 'info'
      }
    }

    if (assistantMode === 'executing') {
      return {
        ...snapshot,
        id: 'assistant-executing',
        mobileText: 'Working',
        mobileExpandedText: 'Executing action',
        desktopTitle: 'Executing...',
        desktopDetail: 'Applying the command right now.',
        actionLabel: 'Wait',
        actionPath: snapshot.actionPath,
        icon: 'brain',
        tone: 'active'
      }
    }

    if (['success', 'error', 'confirm'].includes(assistantMode) && assistantResult) {
      const isError = assistantResult.status === 'error'
      const isConfirm = assistantResult.status === 'confirmation'
      return {
        ...snapshot,
        id: 'assistant-result',
        mobileText: getShortMessage(assistantResult.message, 20),
        mobileExpandedText: getShortMessage(assistantResult.fullMessage, 24),
        desktopTitle: assistantResult.message,
        desktopDetail: assistantResult.fullMessage,
        actionLabel: isConfirm ? 'Confirm' : 'Done',
        actionPath: snapshot.actionPath,
        icon: isError ? 'alert' : isConfirm ? 'list' : 'sparkles',
        tone: isError ? 'danger' : isConfirm ? 'warning' : 'success'
      }
    }

    return snapshot
  }, [assistantMode, assistantResult, assistantTranscript, snapshot])

  const hidden = HIDE_ROUTES.has(location.pathname) || focusModeActive

  useEffect(() => {
    if (!hidden) return
    stopVoiceListening(voiceSessionRef.current)
    setAssistantMode('idle')
    setPendingConfirmationIntent(null)
    setTextEntryOpen(false)
  }, [hidden])

  const Icon = iconMap[displaySnapshot.icon] || Sparkles
  const tone = toneClasses[displaySnapshot.tone] || toneClasses.neutral

  const handleAction = () => {
    if (assistantMode === 'listening') {
      stopVoiceAssistant()
      return
    }

    if (assistantMode === 'processing' || assistantMode === 'executing') {
      return
    }

    if (assistantMode === 'confirm' && pendingConfirmationIntent) {
      void runAssistantCommand(assistantTranscript || 'confirm', pendingConfirmationIntent)
      return
    }

    if (displaySnapshot.actionState?.autopilot) {
      queueAutopilotLaunch({
        userId: user?.id,
        plan: displaySnapshot.metadata?.autopilotPlan
      })
    }

    if (displaySnapshot.actionState) {
      navigate(displaySnapshot.actionPath, { state: displaySnapshot.actionState })
      return
    }
    navigate(displaySnapshot.actionPath)
  }

  const handleExamTap = () => {
    const examPlan = displaySnapshot.metadata?.examPlan
    if (!examPlan) return
    navigate('/exam-simulation', {
      state: {
        ...examPlan,
        autoStart: true
      }
    })
  }

  const showExamAction =
    Boolean(displaySnapshot.metadata?.examPlan) &&
    !['/study', '/exam-simulation', '/exam-result'].includes(location.pathname)

  const handleMobileTap = () => {
    if (assistantMode === 'listening') {
      stopVoiceAssistant()
      return
    }

    switch (displaySnapshot.type) {
      case 'alert':
        navigate('/tasks')
        break
      case 'timer':
        navigate('/study')
        break
      case 'insight':
        navigate('/analytics')
        break
      default:
        if (displaySnapshot.actionState?.autopilot) {
          queueAutopilotLaunch({
            userId: user?.id,
            plan: displaySnapshot.metadata?.autopilotPlan
          })
        }
        if (displaySnapshot.actionState) {
          navigate(displaySnapshot.actionPath, { state: displaySnapshot.actionState })
          return
        }
        navigate(displaySnapshot.actionPath)
        break
    }
  }

  return (
    <>
      <AnimatePresence>
        {!hidden ? (
          <MobileIsland
            key={`mobile-island-${displaySnapshot.id}`}
            snapshot={displaySnapshot}
            tone={tone}
            Icon={Icon}
            onTap={handleMobileTap}
            onVoiceStart={startVoiceAssistant}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!hidden ? (
          <DesktopAssistant
            key={`desktop-assistant-${displaySnapshot.id}`}
            snapshot={displaySnapshot}
            tone={tone}
            Icon={Icon}
            onAction={handleAction}
            onExamTap={handleExamTap}
            showExamAction={showExamAction}
            onVoiceTap={startVoiceAssistant}
            onVoiceStop={stopVoiceAssistant}
            onTextTap={() => {
              setAssistantMode('idle')
              setAssistantResult(null)
              setAssistantPreview(null)
              setAssistantTranscript('')
              setPendingConfirmationIntent(null)
              setTextEntryOpen(true)
            }}
            voiceSupported={voiceSupported}
            assistantMode={assistantMode}
          />
        ) : null}
      </AnimatePresence>

      {!hidden ? (
        <AssistantCommandPanel
        open={assistantMode !== 'idle' || textEntryOpen}
        mode={assistantMode}
        transcript={assistantTranscript}
        preview={assistantPreview}
        result={assistantResult}
        pendingConfirmation={pendingConfirmationIntent}
        textEntryOpen={textEntryOpen}
        textValue={textCommand}
        setTextValue={setTextCommand}
        onSubmitText={(event) => {
          event.preventDefault()
          void runAssistantCommand(textCommand)
        }}
        onConfirmIntent={() => {
          if (!pendingConfirmationIntent) return
          void runAssistantCommand(assistantTranscript || 'confirm', pendingConfirmationIntent)
        }}
        onCancelConfirmation={() => {
          setPendingConfirmationIntent(null)
          setAssistantMode('idle')
          setAssistantResult(null)
        }}
        onClose={closeAssistantPanel}
        onStopListening={stopVoiceAssistant}
        voiceSupported={voiceSupported}
      />
      ) : null}
    </>
  )
}

export default DynamicIsland
