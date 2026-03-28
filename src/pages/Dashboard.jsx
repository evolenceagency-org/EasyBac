import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ListTodo, Sparkles, TimerReset } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext.jsx'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const formatDueLabel = (task) => {
  if (!task?.due_date) return 'No due date'
  const due = new Date(task.due_date)
  if (Number.isNaN(due.getTime())) return 'No due date'
  const today = new Date()
  const dueKey = due.toDateString()
  const todayKey = today.toDateString()
  if (dueKey === todayKey) return 'Due today'
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

const Dashboard = () => {
  const { tasks, studySessions } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [showOnboardingToast, setShowOnboardingToast] = useState(false)

  useEffect(() => {
    const fromState = Boolean(location.state?.fromOnboarding)
    if (!fromState) return

    setShowOnboardingToast(true)
    navigate(location.pathname, { replace: true, state: {} })
    const timer = window.setTimeout(() => setShowOnboardingToast(false), 3200)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  const incompleteTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  )

  const nextTask = useMemo(() => {
    const sorted = [...incompleteTasks].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (b.status === 'active' && a.status !== 'active') return 1
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

    return sorted[0] || null
  }, [incompleteTasks])

  const todaysMinutes = useMemo(() => {
    const todayKey = new Date().toDateString()
    return studySessions.reduce((total, session) => {
      const sessionDate = session?.date ? new Date(session.date) : null
      if (sessionDate && sessionDate.toDateString() === todayKey) {
        return total + (session.duration_minutes || 0)
      }
      return total
    }, 0)
  }, [studySessions])

  const todaysPlan = useMemo(() => incompleteTasks.slice(0, 3), [incompleteTasks])

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-5xl flex-col gap-5"
    >
      <AnimatePresence>
        {showOnboardingToast ? (
          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            Setup complete — your workspace is ready.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Assistant</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              {nextTask ? nextTask.title : 'Your next move is ready'}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/65">
              {nextTask
                ? `${formatDueLabel(nextTask)} • ${nextTask.status || 'Ready'}. Start a focused block and keep momentum.`
                : 'You’re clear to start a new focus session or plan the next task.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/study', { state: nextTask ? { suggestedTaskId: nextTask.id } : undefined })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            Start focus
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Today’s plan</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Focus today</p>
              <p className="mt-2 text-2xl font-semibold text-white">{todaysMinutes} min</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Tasks open</p>
              <p className="mt-2 text-2xl font-semibold text-white">{incompleteTasks.length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Next task</p>
              <p className="mt-2 text-sm font-medium text-white">{nextTask?.title || 'Nothing queued'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Start session</p>
          <h2 className="mt-3 text-xl font-semibold">Keep your momentum going</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Open study mode and start a focused block with the next task already in mind.
          </p>
          <button
            type="button"
            onClick={() => navigate('/study', { state: nextTask ? { suggestedTaskId: nextTask.id } : undefined })}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
          >
            <TimerReset className="h-4 w-4 text-[#c084fc]" />
            Start a session
          </button>
        </section>
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Tasks</p>
            <h2 className="mt-2 text-xl font-semibold">What’s on deck</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/tasks')}
            className="text-sm font-medium text-white/65 transition hover:text-white"
          >
            Open tasks
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {todaysPlan.length > 0 ? (
            todaysPlan.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-white/50">{formatDueLabel(task)} • {task.status || 'Ready'}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/75">
                  <ListTodo className="h-4 w-4" />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-white/65">
              No tasks yet. Add one in Tasks and we’ll bring it back here as your next move.
            </div>
          )}
        </div>
      </section>
    </motion.div>
  )
}

export default Dashboard

