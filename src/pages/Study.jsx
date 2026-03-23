import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toDateKey } from '../utils/dateUtils.js'
import { motion } from 'framer-motion'
import { Maximize2, X } from 'lucide-react'
import useStudyTimer from '../hooks/useStudyTimer.js'
import { useData } from '../context/DataContext.jsx'
import RecentSessions from '../components/RecentSessions.jsx'
import SessionConflictModal from '../components/SessionConflictModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive } from '../utils/subscription.js'
import { checkTrialAndBlock } from '../utils/subscriptionGuard.js'
import GlassCard from '../components/GlassCard.jsx'
import GlassDropdown from '../components/Tasks/GlassDropdown.jsx'
import {
  clearActiveFocusTaskId,
  formatFocusSummary,
  getActiveFocusTaskId,
  getSuggestedFocusTask,
  setActiveFocusTaskId
} from '../utils/focusTasks.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const formatTwoDigits = (value) => String(value).padStart(2, '0')

const Study = () => {
  const {
    mode,
    pomodoroMinutes,
    setPomodoroMinutes,
    breakMinutes,
    phase,
    isRunning,
    isActiveSession,
    pendingMode,
    requestModeChange,
    clearPendingMode,
    applyPendingModeSwitch,
    minutes,
    seconds,
    progress,
    sessionMinutes,
    recoverySession,
    resumeRecovery,
    discardRecovery,
    computeRecoveryMinutes,
    start,
    pause,
    reset,
    finish
  } = useStudyTimer()

  const { profile, user } = useAuth()
  const location = useLocation()
  const { tasks, studySessions, loading, errors, addStudySession, updateTaskById } = useData()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState(null)

  const recentSessions = useMemo(
    () => studySessions.slice(0, 5),
    [studySessions]
  )

  const subscriptionActive = useMemo(
    () => isSubscriptionActive(profile),
    [profile]
  )
  const lockActions = !subscriptionActive
  const showExpired = Boolean(profile) && !subscriptionActive
  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completed && task.status !== 'completed'),
    [tasks]
  )
  const activeTask = useMemo(
    () => pendingTasks.find((task) => task.id === activeTaskId) || null,
    [pendingTasks, activeTaskId]
  )
  const suggestedTask = useMemo(
    () => getSuggestedFocusTask(pendingTasks, profile?.personalization || profile),
    [pendingTasks, profile]
  )
  const taskOptions = useMemo(
    () => [
      { label: 'Free session', value: 'free-session' },
      ...pendingTasks.map((task) => ({
        label: `${task.title} • ${task.subject || 'General'}`,
        value: task.id
      }))
    ],
    [pendingTasks]
  )
  const shouldSuggestComplete = useMemo(() => {
    if (!activeTask || activeTask.completed) return false
    return (activeTask.totalFocusTime || 0) + sessionMinutes >= 90
  }, [activeTask, sessionMinutes])

  useEffect(() => {
    const routeTaskId = location.state?.taskId
    if (routeTaskId) {
      setActiveTaskId(routeTaskId)
      return
    }

    if (!user?.id) return
    const storedTaskId = getActiveFocusTaskId(user.id)
    if (storedTaskId) {
      setActiveTaskId(storedTaskId)
    }
  }, [location.state, user?.id])

  useEffect(() => {
    if (loading.tasks) return
    if (!pendingTasks.length) {
      setActiveTaskId(null)
      return
    }

    if (activeTaskId && pendingTasks.some((task) => task.id === activeTaskId)) {
      return
    }

    if (suggestedTask) {
      setActiveTaskId(suggestedTask.id)
    }
  }, [activeTaskId, loading.tasks, pendingTasks, suggestedTask])

  useEffect(() => {
    if (!user?.id) return
    if (activeTaskId) {
      setActiveFocusTaskId(user.id, activeTaskId)
    } else {
      clearActiveFocusTaskId(user.id)
    }
  }, [activeTaskId, user?.id])

  useEffect(() => {
    if (phase === 'completed') {
      setShowModal(true)
    }
  }, [phase])

  useEffect(() => {
    if (recoverySession) {
      setShowRecoveryModal(true)
    }
  }, [recoverySession])

  useEffect(() => {
    if (!isRunning) return
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isRunning])

  const buildLinkedSessionPayload = useCallback(
    (minutesToSave, sessionMode = mode) => {
      const endedAt = new Date().toISOString()
      const startedAt = new Date(
        Date.now() - Math.max(1, minutesToSave) * 60 * 1000
      ).toISOString()

      return {
        date: toDateKey(new Date()),
        duration_minutes: minutesToSave,
        mode: sessionMode,
        taskId: activeTask?.id || null,
        startedAt,
        endedAt
      }
    },
    [activeTask?.id, mode]
  )

  const handleSaveSession = async () => {
    if (!checkTrialAndBlock(profile, navigate)) return
    setSaveError('')
    try {
      await addStudySession(buildLinkedSessionPayload(sessionMinutes, mode))
      setShowModal(false)
      setSavedMessage('Session saved!')
      reset()
      setTimeout(() => setSavedMessage(''), 2500)
      return true
    } catch (error) {
      setSaveError('Unable to save the session. Please try again.')
      return false
    }
  }

  const handleStart = () => {
    if (!checkTrialAndBlock(profile, navigate)) return
    start()
  }

  const handleFinish = () => {
    if (sessionMinutes === 0) return
    if (!checkTrialAndBlock(profile, navigate)) return
    finish()
    setShowModal(true)
  }

  const handleTaskSelection = useCallback((taskId) => {
    setActiveTaskId(taskId === 'free-session' ? null : taskId)
  }, [])

  const handleMarkTaskDone = useCallback(async () => {
    if (!activeTask || activeTask.completed) return
    if (!checkTrialAndBlock(profile, navigate)) return

    try {
      await updateTaskById(activeTask.id, {
        completed: true,
        status: 'completed'
      })
      setSavedMessage('Task marked as done!')
      setTimeout(() => setSavedMessage(''), 2500)
    } catch {
      setSaveError('Unable to mark the task as done right now.')
    }
  }, [activeTask, navigate, profile, updateTaskById])

  const handleSaveAndSwitch = async () => {
    if (!pendingMode) return
    if (!checkTrialAndBlock(profile, navigate)) return
    setSaveError('')
    try {
      if (sessionMinutes > 0) {
        await addStudySession(buildLinkedSessionPayload(sessionMinutes, mode))
      }
      applyPendingModeSwitch()
    } catch (error) {
      setSaveError('Unable to save the session. Please try again.')
    }
  }

  const handleDiscardAndSwitch = () => {
    applyPendingModeSwitch()
  }

  const handleContinueSession = () => {
    clearPendingMode()
  }

  const handleResumeRecovery = () => {
    if (!checkTrialAndBlock(profile, navigate)) return
    resumeRecovery()
    setShowRecoveryModal(false)
  }

  const handleDiscardRecovery = () => {
    discardRecovery()
    setShowRecoveryModal(false)
  }

  const handleSaveRecovery = async () => {
    if (!recoverySession) return
    if (!checkTrialAndBlock(profile, navigate)) return
    setSaveError('')
    try {
      const minutesToSave = computeRecoveryMinutes(recoverySession)
      if (!minutesToSave) {
        discardRecovery()
        setShowRecoveryModal(false)
        return
      }
      await addStudySession(buildLinkedSessionPayload(minutesToSave, recoverySession.mode))
      discardRecovery()
      setShowRecoveryModal(false)
      setSavedMessage('Session saved!')
      setTimeout(() => setSavedMessage(''), 2500)
    } catch (error) {
      setSaveError('Unable to save the session. Please try again.')
    }
  }

  const statusLabel = useMemo(() => {
    if (isRunning) {
      return phase === 'break'
        ? 'Break time — recharge'
        : 'Deep focus in progress...'
    }
    if (sessionMinutes > 0) return 'Paused — stay focused'
    return 'Ready'
  }, [isRunning, phase, sessionMinutes])

  const enterFullscreen = useCallback(async () => {
    const el = document.documentElement
    if (el.requestFullscreen) {
      await el.requestFullscreen()
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen()
    }
  }, [])

  const toggleFocusMode = useCallback(async () => {
    if (isFocusMode) {
      await exitFullscreen()
      setIsFocusMode(false)
    } else {
      await enterFullscreen()
      setIsFocusMode(true)
    }
  }, [enterFullscreen, exitFullscreen, isFocusMode])

  useEffect(() => {
    const handleChange = () => {
      if (!document.fullscreenElement) {
        setIsFocusMode(false)
      }
    }
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  useEffect(() => {
    const handleKey = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        toggleFocusMode()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleFocusMode])

  useEffect(() => {
    if (isFocusMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFocusMode])

  const radius = 120
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const activeLabel = mode === 'pomodoro' ? 'Pomodoro' : 'Free Study'

  const timerContent = (
    <GlassCard
      className={`relative p-4 transition-all duration-500 md:p-6 ${
        isFocusMode ? 'scale-105 md:scale-125 shadow-[0_0_60px_rgba(139,92,246,0.4)]' : ''
      }`}
    >
      {isRunning && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-purple-500/10 blur-2xl md:blur-3xl" />
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/70">
            Study Timer
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
            Deep Focus Session
          </h3>
          <p className="mt-2 hidden text-sm text-white/70 sm:block">
            Choose a mode, start the timer, and save your session when you are
            done.
          </p>
        </div>

      </div>

      <div className="mt-5 grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">
              Focus task
            </p>
            <p className="mt-1 text-sm text-white/72">
              {pendingTasks.length > 0
                ? 'Pick a task to link this session and track real progress.'
                : 'No tasks available yet. You can still run a free focus session.'}
            </p>
          </div>
          {suggestedTask && !activeTask && (
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-100">
              Suggested: {suggestedTask.title}
            </span>
          )}
        </div>

        <GlassDropdown
          value={activeTaskId || 'free-session'}
          onChange={handleTaskSelection}
          options={taskOptions}
          placeholder="Select a task"
          disabled={lockActions}
        />

        {activeTask ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/8 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {activeTask.title}
                </p>
                <p className="mt-1 text-xs text-cyan-100/80">
                  {activeTask.subject} • {formatFocusSummary(activeTask.totalFocusTime, activeTask.sessionsCount)}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70">
                {activeTask.status === 'completed' || activeTask.completed ? 'Completed' : 'Active'}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
            No task selected — start a free session or choose a task above.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => requestModeChange('free')}
          disabled={lockActions}
          className={`rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all duration-300 ease-out ${
            mode === 'free'
              ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
              : 'border border-white/10 bg-white/5 text-white/80 hover:border-purple-400/30'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Free Study
        </button>
        <button
          type="button"
          onClick={() => requestModeChange('pomodoro')}
          disabled={lockActions}
          className={`rounded-full px-4 py-2 text-xs font-semibold backdrop-blur-md transition-all duration-300 ease-out ${
            mode === 'pomodoro'
              ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]'
              : 'border border-white/10 bg-white/5 text-white/80 hover:border-purple-400/30'
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          Pomodoro
        </button>
      </div>

      {isActiveSession && (
        <p className="mt-3 text-xs text-white/60">Active session: {activeLabel}</p>
      )}

      {mode === 'pomodoro' && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
          {[30, 45, 60].map((value) => (
            <motion.button
              key={value}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setPomodoroMinutes(value)}
              disabled={lockActions}
              className={`rounded-full px-4 py-2 font-semibold transition-all duration-300 ease-out ${
                pomodoroMinutes === value
                  ? 'bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white shadow-[0_0_12px_rgba(139,92,246,0.35)] scale-105'
                  : 'border border-white/10 bg-white/5 text-white/80 hover:border-purple-400/30'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {value} min
            </motion.button>
          ))}
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
            Break: {breakMinutes} min
          </span>
        </div>
      )}

      <div className="mt-8 flex flex-col items-center md:mt-10">
        <motion.div
          animate={isRunning ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={{ duration: 2.6, repeat: isRunning ? Infinity : 0 }}
          className="relative h-60 w-60 md:h-72 md:w-72"
        >
          <svg className="h-full w-full" viewBox="0 0 260 260">
            <defs>
              <linearGradient id="focus-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <circle
              cx="130"
              cy="130"
              r={radius}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="12"
              fill="transparent"
            />
            <motion.circle
              cx="130"
              cy="130"
              r={radius}
              stroke="url(#focus-gradient)"
              strokeWidth="12"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 0.5 }}
              transform="rotate(-90 130 130)"
              style={{
                filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.6))'
              }}
            />
          </svg>

          <div className="absolute inset-6 flex flex-col items-center justify-center rounded-full border border-white/10 bg-white/5 backdrop-blur-xl">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 to-transparent" />
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {mode === 'pomodoro'
                ? phase === 'break'
                  ? 'Break'
                  : phase === 'completed'
                    ? 'Done'
                    : 'Focus'
                : 'Session'}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              {formatTwoDigits(minutes)}:{formatTwoDigits(seconds)}
            </p>
            <p className="mt-2 text-xs text-white/70">{statusLabel}</p>
            <p className="mt-2 text-xs text-white/60">
              {mode === 'pomodoro'
                ? `${pomodoroMinutes} min study`
                : 'Free study mode'}
            </p>
          </div>
        </motion.div>

        <div className="mt-8 flex w-full flex-wrap gap-3">
          {!isRunning ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              disabled={lockActions}
              className="w-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Start
            </motion.button>
          ) : (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={pause}
              disabled={lockActions}
              className="w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_12px_rgba(255,255,255,0.08)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              Pause
            </motion.button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={reset}
            disabled={lockActions}
            className="w-full rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Reset
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleFinish}
            disabled={lockActions}
            className="w-full rounded-full border border-white/10 bg-white/10 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            Finish Session
          </motion.button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleFocusMode}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:shadow-[0_0_15px_rgba(139,92,246,0.3)] sm:w-auto"
          >
            <Maximize2 className="h-4 w-4" />
            {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
          </motion.button>
        </div>

      </div>
    </GlassCard>
  )

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="flex max-w-full flex-col gap-4 md:gap-6"
    >
      {isFocusMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-4 transition-all duration-500 md:px-6">
          <div className="pointer-events-none absolute inset-0 bg-purple-500/10 blur-2xl md:blur-3xl" />
          <button
            type="button"
            onClick={toggleFocusMode}
            className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 shadow-[0_0_12px_rgba(139,92,246,0.35)] backdrop-blur-md transition hover:shadow-[0_0_18px_rgba(139,92,246,0.45)] md:right-6 md:top-6 md:px-4"
          >
            <X className="h-4 w-4" />
            Exit Focus
          </button>
          <div className="w-full max-w-3xl">{timerContent}</div>
        </div>
      )}

      {savedMessage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {savedMessage}
        </motion.div>
      )}

      {showExpired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Trial expired. Upgrade to continue.
        </div>
      )}

      {(saveError || errors.sessions) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {saveError || errors.sessions}
        </div>
      )}

      <div className="grid max-w-full gap-4 md:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        {timerContent}
        <RecentSessions sessions={recentSessions} loading={loading.sessions} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6"
          >
            <h4 className="text-xl font-semibold">Save this session?</h4>
            <p className="mt-2 text-sm text-zinc-300">
              {mode === 'pomodoro'
                ? `Pomodoro focus: ${sessionMinutes} minutes.`
                : `Free study duration: ${sessionMinutes} minutes.`}
            </p>
            {activeTask && (
              <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/85">
                Linked to: <span className="font-semibold text-white">{activeTask.title}</span>
                <p className="mt-1 text-xs text-cyan-100/70">
                  {formatFocusSummary(
                    (activeTask.totalFocusTime || 0) + sessionMinutes,
                    (activeTask.sessionsCount || 0) + 1
                  )}
                </p>
              </div>
            )}
            {shouldSuggestComplete && activeTask && (
              <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100/85">
                This task now has enough focus time. You can mark it as done after saving.
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveSession}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900"
              >
                Save Session
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  reset()
                }}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              >
                Discard
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {showRecoveryModal && recoverySession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-6"
          >
            <h4 className="text-xl font-semibold">
              Resume your previous session?
            </h4>
            <p className="mt-2 text-sm text-zinc-300">
              {recoverySession.mode === 'pomodoro'
                ? `Pomodoro ${recoverySession.pomodoroMinutes} min`
                : 'Free study session'}{' '}
              - {recoverySession.durationMinutes || 0} min logged
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResumeRecovery}
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={handleSaveRecovery}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              >
                Save Session
              </button>
              <button
                type="button"
                onClick={handleDiscardRecovery}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              >
                Discard
              </button>
              {shouldSuggestComplete && activeTask && (
                <button
                  type="button"
                  onClick={async () => {
                    const saved = await handleSaveSession()
                    if (saved) {
                      await handleMarkTaskDone()
                    }
                  }}
                  className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-6 py-3 text-sm font-semibold text-cyan-100"
                >
                  Save & Mark Done
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {pendingMode && (
        <SessionConflictModal
          currentModeLabel={activeLabel}
          onContinue={handleContinueSession}
          onSaveAndSwitch={handleSaveAndSwitch}
          onDiscardAndSwitch={handleDiscardAndSwitch}
        />
      )}
    </motion.div>
  )
}

export default Study



