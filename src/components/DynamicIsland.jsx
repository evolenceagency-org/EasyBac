import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BrainCircuit,
  CircleAlert,
  ListChecks,
  Sparkles,
  Timer
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { getIslandState } from '../utils/assistantBar.js'
import { getActiveFocusTaskId } from '../utils/focusTasks.js'

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
  '/welcome-ai'
])
const DESKTOP_AUTO_COLLAPSE_MS = 4200
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

const MobileIsland = ({ snapshot, tone, Icon, onTap }) => {
  const pulse = PULSE_STATES.has(snapshot.id)

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
        onClick={onTap}
        className={`pointer-events-auto group relative flex h-[40px] min-w-[132px] max-w-[78vw] items-center overflow-hidden rounded-full border border-white/10 bg-black/72 px-4 shadow-[0_10px_28px_rgba(0,0,0,0.56)] backdrop-blur-2xl ${tone.ring}`}
      >
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r opacity-80 ${tone.surface}`} />
        <motion.div layout className="relative flex min-w-0 items-center gap-2">
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

const DesktopAssistant = ({ snapshot, tone, Icon, onAction }) => {
  const [expanded, setExpanded] = useState(false)

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

        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="relative flex w-full items-center gap-3 px-5 py-3.5 text-left"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 ${tone.icon}`}>
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
            </motion.div>
          </AnimatePresence>

          <div className="flex shrink-0 items-center gap-2">
            {snapshot.mobileText ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/80">
                {snapshot.mobileText}
              </span>
            ) : null}
          </div>
        </button>

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
                <button
                  type="button"
                  onClick={onAction}
                  className={`mt-3 inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition duration-200 hover:scale-[1.02] ${tone.button}`}
                >
                  {snapshot.actionLabel}
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

const DynamicIsland = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { tasks, studySessions } = useData()
  const [timerState, setTimerState] = useState(() => mapTimerState(readActiveSession()))
  const [activeTaskId, setActiveTaskId] = useState(() => getActiveFocusTaskId(user?.id))
  const [transientEvent, setTransientEvent] = useState(null)
  const [focusModeActive, setFocusModeActive] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  )
  const previousCompletedRef = useRef(0)
  const previousRunningRef = useRef(false)
  const previousScoreDateRef = useRef('')

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

  const hidden = HIDE_ROUTES.has(location.pathname) || focusModeActive

  const Icon = iconMap[snapshot.icon] || Sparkles
  const tone = toneClasses[snapshot.tone] || toneClasses.neutral

  const handleAction = () => {
    if (snapshot.actionState) {
      navigate(snapshot.actionPath, { state: snapshot.actionState })
      return
    }
    navigate(snapshot.actionPath)
  }

  const handleMobileTap = () => {
    switch (snapshot.type) {
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
        if (snapshot.actionState) {
          navigate(snapshot.actionPath, { state: snapshot.actionState })
          return
        }
        navigate(snapshot.actionPath)
        break
    }
  }

  return (
    <>
      <AnimatePresence>
        {!hidden ? (
          <MobileIsland
            key={`mobile-island-${snapshot.id}`}
            snapshot={snapshot}
            tone={tone}
            Icon={Icon}
            onTap={handleMobileTap}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {!hidden ? (
          <DesktopAssistant
            key={`desktop-assistant-${snapshot.id}`}
            snapshot={snapshot}
            tone={tone}
            Icon={Icon}
            onAction={handleAction}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default DynamicIsland
