import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toDateKey } from '../utils/dateUtils.js'
import { motion } from 'framer-motion'
import useStudyTimer from '../hooks/useStudyTimer.js'
import { useData } from '../context/DataContext.jsx'
import RecentSessions from '../components/RecentSessions.jsx'
import SessionConflictModal from '../components/SessionConflictModal.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive } from '../utils/subscription.js'
import { checkTrialAndBlock } from '../utils/subscriptionGuard.js'

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

  const { profile } = useAuth()
  const { studySessions, loading, errors, addStudySession } = useData()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedMessage, setSavedMessage] = useState('')

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

  const handleSaveSession = async () => {
    if (!checkTrialAndBlock(profile, navigate)) return
    setSaveError('')
    try {
      const todayKey = toDateKey(new Date())
      await addStudySession({
        date: todayKey,
        duration_minutes: sessionMinutes,
        mode
      })
      setShowModal(false)
      setSavedMessage('Session saved!')
      reset()
      setTimeout(() => setSavedMessage(''), 2500)
    } catch (error) {
      setSaveError('Unable to save the session. Please try again.')
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

  const handleSaveAndSwitch = async () => {
    if (!pendingMode) return
    if (!checkTrialAndBlock(profile, navigate)) return
    setSaveError('')
    try {
      if (sessionMinutes > 0) {
        const todayKey = toDateKey(new Date())
        await addStudySession({
          date: todayKey,
          duration_minutes: sessionMinutes,
          mode
        })
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
      const todayKey = toDateKey(new Date())
      await addStudySession({
        date: todayKey,
        duration_minutes: minutesToSave,
        mode: recoverySession.mode
      })
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
      return phase === 'break' ? 'Break time' : 'Studying...'
    }
    if (sessionMinutes > 0) return 'Paused'
    return 'Ready'
  }, [isRunning, phase, sessionMinutes])

  const radius = 120
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - progress)
  const activeLabel = mode === 'pomodoro' ? 'Pomodoro' : 'Free Study'

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Study Timer
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Deep Focus Session</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Choose a mode, start the timer, and save your session when you are
          done.
        </p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => requestModeChange('free')}
              disabled={lockActions}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === 'free'
                  ? 'bg-white text-zinc-900'
                  : 'border border-white/20 text-white'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Free Study
            </button>
            <button
              type="button"
              onClick={() => requestModeChange('pomodoro')}
              disabled={lockActions}
              className={`rounded-full px-4 py-2 text-xs font-semibold ${
                mode === 'pomodoro'
                  ? 'bg-white text-zinc-900'
                  : 'border border-white/20 text-white'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Pomodoro
            </button>
          </div>

          {isActiveSession && (
            <p className="mt-4 text-xs text-zinc-400">
              Active session: {activeLabel}
            </p>
          )}

          {mode === 'pomodoro' && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-300">
              {[30, 45, 60].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPomodoroMinutes(value)}
                  disabled={lockActions}
                  className={`rounded-full px-4 py-2 font-semibold ${
                    pomodoroMinutes === value
                      ? 'bg-violet-500 text-white'
                      : 'border border-white/20 text-white'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {value} min
                </button>
              ))}
              <span className="rounded-full border border-white/10 px-4 py-2">
                Break: {breakMinutes} min
              </span>
            </div>
          )}

          <div className="mt-10 flex flex-col items-center">
            <div className="relative h-72 w-72">
              <svg className="h-full w-full" viewBox="0 0 260 260">
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
                  stroke="rgba(139,92,246,0.8)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  fill="transparent"
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 0.5 }}
                  transform="rotate(-90 130 130)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
                  {mode === 'pomodoro'
                    ? phase === 'break'
                      ? 'Break'
                      : phase === 'completed'
                        ? 'Done'
                        : 'Focus'
                    : 'Session'}
                </p>
                <p className="mt-3 text-4xl font-semibold">
                  {formatTwoDigits(minutes)}:{formatTwoDigits(seconds)}
                </p>
                <p className="mt-2 text-xs text-zinc-400">{statusLabel}</p>
                <p className="mt-2 text-xs text-zinc-400">
                  {mode === 'pomodoro'
                    ? `${pomodoroMinutes} min study`
                    : 'Free study mode'}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {!isRunning ? (
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={lockActions}
                  className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pause}
                  disabled={lockActions}
                  className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Pause
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                disabled={lockActions}
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={lockActions}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Finish Session
              </button>
            </div>
          </div>
        </div>

        <RecentSessions sessions={recentSessions} loading={loading.sessions} />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
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


