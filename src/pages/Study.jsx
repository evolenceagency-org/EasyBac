import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Pause, Play, RotateCcw, TimerReset } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ExamCountdownBanner from '../components/dashboard/ExamCountdownBanner.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import useStudyTimer from '../hooks/useStudyTimer.js'
import {
  formatDueLabel,
  formatMinutes,
  formatTaskPriority,
  getExamCountdown,
  getStudyTotals,
  getTodayStudyMinutes,
  sortTasksByPriorityAndDueDate
} from '../utils/dashboardMetrics.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const formatClock = (minutes, seconds) =>
  `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

const Study = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const {
    tasks,
    studySessions,
    loading,
    errors,
    addStudySession,
    toggleTask
  } = useData()
  const {
    currentMode,
    setMode,
    minutes,
    seconds,
    progress,
    phase,
    isRunning,
    isActiveSession,
    sessionMinutes,
    recoverySession,
    resumeRecovery,
    discardRecovery,
    start,
    pause,
    finish,
    reset
  } = useStudyTimer()

  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' })

  const countdown = useMemo(() => getExamCountdown(profile), [profile])
  const sortedTasks = useMemo(
    () => sortTasksByPriorityAndDueDate(tasks).filter((task) => !task.completed),
    [tasks]
  )
  const selectedTask = useMemo(
    () => sortedTasks.find((task) => task.id === selectedTaskId) || null,
    [selectedTaskId, sortedTasks]
  )
  const todayMinutes = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions])
  const studyTotals = useMemo(() => getStudyTotals(studySessions), [studySessions])
  const recentSessions = useMemo(() => studySessions.slice(0, 5), [studySessions])

  useEffect(() => {
    if (location.state?.suggestedTaskId && !selectedTaskId) {
      setSelectedTaskId(location.state.suggestedTaskId)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate, selectedTaskId])

  useEffect(() => {
    if (!selectedTaskId && sortedTasks[0]?.id) {
      setSelectedTaskId(sortedTasks[0].id)
    }
  }, [selectedTaskId, sortedTasks])

  useEffect(() => {
    if (!recoverySession && !isActiveSession && currentMode !== 'free') {
      setMode('free')
    }
  }, [currentMode, isActiveSession, recoverySession, setMode])

  const handleSaveSession = async (markTaskDone = false) => {
    if (sessionMinutes <= 0) return

    try {
      setSaveState({ status: 'saving', message: '' })
      await addStudySession({
        date: new Date().toISOString(),
        duration_minutes: sessionMinutes,
        mode: currentMode,
        taskId: selectedTask?.id || null,
        subject: selectedTask?.subject || 'general',
        title: selectedTask?.title || 'Focus session',
        endedAt: new Date().toISOString()
      })

      if (markTaskDone && selectedTask && !selectedTask.completed) {
        await toggleTask(selectedTask.id, selectedTask.completed)
      }

      reset()
      setSaveState({
        status: 'success',
        message: markTaskDone
          ? 'Session saved and task marked done.'
          : 'Session saved successfully.'
      })
    } catch {
      setSaveState({
        status: 'error',
        message: 'We could not save the session. Please try once more.'
      })
    }
  }

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
    >
      <ExamCountdownBanner countdown={countdown} onManageDate={() => navigate('/personalization')} />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Study</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">One clear timer, one selected task</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            Start, pause, resume, or end. Then save the session and update task progress without leaving the page.
          </p>

          <div className="mt-8 rounded-[2rem] border border-white/[0.08] bg-white/[0.03] px-6 py-8 text-center">
            <p className="text-sm text-white/55">Focus timer</p>
            <div className="mt-3 text-6xl font-semibold tracking-tight text-white md:text-7xl">{formatClock(minutes, seconds)}</div>
            <div className="mx-auto mt-6 h-2 max-w-md rounded-full bg-white/[0.08]">
              <div className="h-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] transition-all" style={{ width: `${Math.max(6, progress * 100)}%` }} />
            </div>
            <div className="mt-3 text-sm text-white/50">
              {phase === 'completed'
                ? 'Session finished'
                : isRunning
                  ? 'Timer running'
                  : isActiveSession
                    ? 'Paused'
                    : 'Ready to start'}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {!isRunning && phase !== 'completed' ? (
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
                >
                  <Play className="h-4 w-4" />
                  {isActiveSession ? 'Resume' : 'Start'}
                </button>
              ) : null}

              {isRunning ? (
                <button
                  type="button"
                  onClick={pause}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/[0.14] hover:bg-white/[0.06]"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : null}

              {isActiveSession && phase !== 'completed' ? (
                <button
                  type="button"
                  onClick={finish}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/85 transition hover:border-white/[0.14] hover:bg-white/[0.06]"
                >
                  <TimerReset className="h-4 w-4" />
                  End session
                </button>
              ) : null}

              {(isActiveSession || phase === 'completed') ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-transparent px-5 py-3 text-sm font-semibold text-white/70 transition hover:border-white/[0.14] hover:text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Selected task</p>
            <select
              value={selectedTaskId}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-white/[0.08] bg-[#0b0b0f] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8b5cf6]/45"
            >
              {sortedTasks.length === 0 ? <option value="">No active tasks</option> : null}
              {sortedTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>

            {selectedTask ? (
              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-sm font-medium text-white">{selectedTask.title}</p>
                <p className="mt-2 text-xs text-white/50">
                  {formatTaskPriority(selectedTask.priority)} priority � {formatDueLabel(selectedTask.due_date)}
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 text-sm text-white/65">
                Create a task first if you want sessions linked to a specific subject.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Session tracking</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs text-white/50">Today</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatMinutes(todayMinutes)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs text-white/50">All time</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatMinutes(studyTotals.totalMinutes)}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
                <p className="text-xs text-white/50">Sessions</p>
                <p className="mt-2 text-xl font-semibold text-white">{studyTotals.sessionsCount}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {recoverySession ? (
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Recovered session</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/70">
              You still have a saved session of about {recoverySession.durationMinutes} minutes.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={resumeRecovery}
                className="rounded-2xl bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
              >
                Resume
              </button>
              <button
                type="button"
                onClick={discardRecovery}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
              >
                Discard
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {phase === 'completed' ? (
        <section className="rounded-3xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/8 p-5 backdrop-blur-[20px]">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#d8b4fe]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">Session complete</p>
              <p className="mt-1 text-sm text-white/70">
                You logged {formatMinutes(sessionMinutes)}{selectedTask ? ` on ${selectedTask.title}` : ''}. Save it now and optionally mark the task as done.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSaveSession(false)}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
            >
              Save session
            </button>
            <button
              type="button"
              onClick={() => handleSaveSession(true)}
              disabled={!selectedTask}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save and mark done
            </button>
          </div>
        </section>
      ) : null}

      {saveState.message ? (
        <div className={`rounded-2xl px-4 py-3 text-sm ${saveState.status === 'error' ? 'border border-red-500/20 bg-red-500/10 text-red-200' : 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-100'}`}>
          {saveState.message}
        </div>
      ) : null}

      {(errors.tasks || errors.sessions) ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.tasks || errors.sessions}
        </div>
      ) : null}

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Recent sessions</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Latest tracking</h2>
          </div>
          {loading.sessions ? <p className="text-sm text-white/50">Loading...</p> : null}
        </div>

        <div className="mt-5 space-y-3">
          {recentSessions.length > 0 ? (
            recentSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{session.taskTitle || session.title || session.subject || 'Focus session'}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <p className="text-sm font-medium text-white">{formatMinutes(session.duration_minutes)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-white/65">
              No sessions yet. Your first one will appear here after you save it.
            </div>
          )}
        </div>
      </section>
    </motion.div>
  )
}

export default Study
