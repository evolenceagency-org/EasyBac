import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Sparkles, TimerReset } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import ExamCountdownBanner from '../components/dashboard/ExamCountdownBanner.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  formatDueLabel,
  formatMinutes,
  formatTaskPriority,
  getExamCountdown,
  getNextActionTask,
  getStudyTotals,
  getTodayStudyMinutes,
  getTodayTasks
} from '../utils/dashboardMetrics.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const Dashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { tasks, studySessions } = useData()
  const { profile } = useAuth()
  const [showOnboardingToast, setShowOnboardingToast] = useState(false)

  useEffect(() => {
    const fromState = Boolean(location.state?.fromOnboarding)
    if (!fromState) return

    setShowOnboardingToast(true)
    navigate(location.pathname, { replace: true, state: {} })
    const timer = window.setTimeout(() => setShowOnboardingToast(false), 3200)
    return () => window.clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  const countdown = useMemo(() => getExamCountdown(profile), [profile])
  const nextTask = useMemo(() => getNextActionTask(tasks), [tasks])
  const todaysTasks = useMemo(() => getTodayTasks(tasks, 5), [tasks])
  const todayMinutes = useMemo(() => getTodayStudyMinutes(studySessions), [studySessions])
  const studyTotals = useMemo(() => getStudyTotals(studySessions), [studySessions])

  const assistantRecommendation = useMemo(() => {
    if (nextTask) {
      return {
        title: `Start with ${nextTask.title}`,
        detail: `${formatTaskPriority(nextTask.priority)} priority � ${formatDueLabel(nextTask.due_date)}`
      }
    }

    return {
      title: 'Start one focus block',
      detail: 'A single clean session today is enough to keep momentum alive.'
    }
  }, [nextTask])

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
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
            Setup complete. Your study workspace is ready.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ExamCountdownBanner countdown={countdown} onManageDate={() => navigate('/personalization')} />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Assistant recommendation</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {assistantRecommendation.title}
              </h1>
              <p className="mt-3 text-sm leading-6 text-white/65">{assistantRecommendation.detail}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Today</p>
              <p className="mt-2 text-2xl font-semibold text-white">{formatMinutes(todayMinutes)}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Open tasks</p>
              <p className="mt-2 text-2xl font-semibold text-white">{tasks.filter((task) => !task.completed).length}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-4">
              <p className="text-xs text-white/50">Sessions logged</p>
              <p className="mt-2 text-2xl font-semibold text-white">{studyTotals.sessionsCount}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Next action</p>
          <h2 className="mt-3 text-xl font-semibold text-white">Start focus</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Open the timer with your next task already selected and keep the session clean.
          </p>

          <button
            type="button"
            onClick={() => navigate('/study', { state: nextTask ? { suggestedTaskId: nextTask.id } : undefined })}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            <TimerReset className="h-4 w-4" />
            Start focus
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Today's tasks</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Top 5 to keep moving</h2>
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
          {todaysTasks.length > 0 ? (
            todaysTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{task.title}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {formatTaskPriority(task.priority)} priority � {formatDueLabel(task.due_date)}
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[#d8b4fe]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-white/65">
              No active tasks yet. Add one in Tasks and it will appear here automatically.
            </div>
          )}
        </div>
      </section>
    </motion.div>
  )
}

export default Dashboard
