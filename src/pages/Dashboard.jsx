import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, GraduationCap, SlidersHorizontal } from 'lucide-react'
import Countdown from '../components/Countdown.jsx'
import DashboardCards from '../components/DashboardCards.jsx'
import StudyTimeChart from '../components/Charts/StudyTimeChart.jsx'
import SubjectFocusChart from '../components/Charts/SubjectFocusChart.jsx'
import WeeklySummary from '../components/WeeklySummary.jsx'
import DashboardTaskSummary from '../components/DashboardTaskSummary.jsx'
import AIInsights from '../components/AIInsights.jsx'
import { useData } from '../context/DataContext.jsx'
import {
  calculateCurrentStreak,
  calculateLongestStreak
} from '../utils/streak.js'
import { toDateKey } from '../utils/dateUtils.js'
import {
  detectWeakSubjects,
  getDailyStudyData,
  getSubjectFocus
} from '../utils/analytics.js'
import {
  getTasksCompletedToday,
  isOverdueTask
} from '../utils/taskStats.js'
import GlassCard from '../components/GlassCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  buildAutopilotPlan,
  queueAutopilotLaunch
} from '../utils/autopilotEngine.ts'
import { buildExamSimulationPlan } from '../utils/examEngine.ts'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const getTodayKey = () => toDateKey(new Date())

const Dashboard = () => {
  const { tasks, studySessions, loading, errors } = useData()
  const { profile } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [showOnboardingToast, setShowOnboardingToast] = useState(false)

  useEffect(() => {
    const fromState = Boolean(location.state?.fromOnboarding)
    const fromSessionStorage =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('onboarding-complete-toast') === '1'

    if (!fromState && !fromSessionStorage) return

    setShowOnboardingToast(true)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('onboarding-complete-toast')
    }

    if (fromState) {
      navigate(location.pathname, { replace: true, state: {} })
    }

    const timer = setTimeout(() => setShowOnboardingToast(false), 3200)
    return () => clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  const todayMinutes = useMemo(() => {
    const todayKey = getTodayKey()
    return studySessions.reduce((total, session) => {
      if (toDateKey(session.date) === todayKey) {
        return total + (session.duration_minutes || 0)
      }
      return total
    }, 0)
  }, [studySessions])

  const totalMinutes = useMemo(
    () =>
      studySessions.reduce(
        (total, session) => total + (session.duration_minutes || 0),
        0
      ),
    [studySessions]
  )

  const currentStreak = useMemo(
    () => calculateCurrentStreak(studySessions),
    [studySessions]
  )

  const longestStreak = useMemo(
    () => calculateLongestStreak(studySessions),
    [studySessions]
  )

  const streakInfo = useMemo(
    () => ({ current: currentStreak, longest: longestStreak }),
    [currentStreak, longestStreak]
  )

  const weakSubjects = useMemo(() => detectWeakSubjects(tasks), [tasks])

  const taskSummary = useMemo(() => {
    const completedToday = getTasksCompletedToday(tasks)
    const pending = tasks.filter((task) => !task.completed).length
    const overdue = tasks.filter((task) => isOverdueTask(task)).length
    return { completedToday, pending, overdue }
  }, [tasks])

  const autopilotPlan = useMemo(
    () =>
      buildAutopilotPlan({
        user: profile?.personalization || profile,
        tasks,
        studySessions
      }),
    [profile, studySessions, tasks]
  )

  const examPlan = useMemo(
    () =>
      buildExamSimulationPlan(profile?.personalization || profile, tasks, {
        studySessions,
        subject: 'auto',
        durationMinutes: null,
        difficulty: 'auto'
      }),
    [profile, studySessions, tasks]
  )

  const dailyStudyData = useMemo(
    () => getDailyStudyData(studySessions),
    [studySessions]
  )

  const subjectFocusData = useMemo(() => getSubjectFocus(tasks), [tasks])

  const handleStartAutopilot = () => {
    const payload = queueAutopilotLaunch({
      userId: profile?.id,
      plan: autopilotPlan
    })

    navigate('/study', {
      state: {
        ...payload,
        autopilot: true
      }
    })
  }

  const handleStartExamSimulation = () => {
    navigate('/exam-simulation', {
      state: {
        ...examPlan,
        autoStart: true
      }
    })
  }

  const quickInsights = useMemo(() => {
    const labels = dailyStudyData.labels || []
    const values = dailyStudyData.datasets?.[0]?.data || []
    if (!labels.length || !values.length) {
      return {
        bestDay: '-',
        worstDay: '-',
        avg: '-',
        topSubject: '-',
        consistency: 0
      }
    }

    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const bestIndex = values.indexOf(maxValue)
    const worstIndex = values.indexOf(minValue)
    const total = values.reduce((sum, v) => sum + v, 0)
    const avg = Math.round(total / values.length)

    const topSubject =
      subjectFocusData.breakdown?.reduce((top, item) => {
        if (!top || item.value > top.value) return item
        return top
      }, null)?.label || '-'

    const consistencyDays = values.filter((v) => v >= 40).length
    const consistency = Math.round((consistencyDays / values.length) * 100)

    return {
      bestDay: labels[bestIndex] || '-',
      worstDay: labels[worstIndex] || '-',
      avg: `${avg} min`,
      topSubject,
      consistency
    }
  }, [dailyStudyData, subjectFocusData])

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="relative flex max-w-full flex-col gap-4 md:gap-6"
    >
      <AnimatePresence>
        {showOnboardingToast && (
          <motion.div
            initial={{ opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="fixed left-1/2 top-4 z-[90] w-[calc(100%-2rem)] max-w-[430px] -translate-x-1/2 rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 shadow-[0_0_30px_rgba(16,185,129,0.22)] backdrop-blur-xl md:left-auto md:right-6 md:top-6 md:w-[430px] md:translate-x-0"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-100">
                  Setup complete
                </p>
                <p className="mt-1 text-xs text-emerald-100/85 md:text-sm">
                  Your workspace is ready with personalized AI insights.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Countdown />
        <WeeklySummary sessions={studySessions} />
      </div>

      <DashboardTaskSummary
        completedToday={taskSummary.completedToday}
        pending={taskSummary.pending}
        overdue={taskSummary.overdue}
      />

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-purple-200/75">
              Focus Autopilot
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {autopilotPlan.active
                ? `Autopilot will start ${autopilotPlan.title}`
                : 'No task ready, start a free focus block'}
            </p>
            <p className="mt-1 text-sm text-white/65">{autopilotPlan.reason}</p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleStartAutopilot}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.28)]"
          >
            Start Autopilot
          </motion.button>
        </div>
      </GlassCard>

      {examPlan && !loading.tasks && (
        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/75">
                Exam Simulation
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {examPlan.subjectLabel} • {examPlan.durationMinutes} min
              </p>
              <p className="mt-1 text-sm text-white/65">{examPlan.reason}</p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleStartExamSimulation}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
            >
              <GraduationCap className="h-4 w-4" />
              Start Exam Simulation
            </motion.button>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-violet-200/75">
              AI Control Center
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              Tune voice, assistant, and autopilot behavior
            </p>
            <p className="mt-1 text-sm text-white/65">
              Keep AI helpful without letting it take over.
            </p>
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/ai-control-center')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.14)]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Open Control Center
          </motion.button>
        </div>
      </GlassCard>

      {(errors.tasks || errors.sessions) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          {errors.tasks || errors.sessions}
        </div>
      )}

      {weakSubjects.length > 0 && (
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          {weakSubjects[0]}
        </div>
      )}

      <DashboardCards
        todayMinutes={todayMinutes}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        totalHours={Math.round(totalMinutes / 60)}
        loading={loading.tasks || loading.sessions}
      />

      <AIInsights
        studySessions={studySessions}
        tasks={tasks}
        streak={streakInfo}
      />

      <div className="relative max-w-full">
        <div className="pointer-events-none absolute -top-16 left-1/2 hidden h-52 w-52 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl md:block" />
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <StudyTimeChart
            data={dailyStudyData}
            title="Daily Study Time"
            subtitle="Last 30 days"
          />
          <div className="flex flex-col gap-4 md:gap-6">
            <SubjectFocusChart
              data={subjectFocusData}
              breakdown={subjectFocusData.breakdown}
            />
            <GlassCard className="p-4 md:p-5">
              <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
                Progress Score
              </p>
              <div className="flex items-center gap-6">
                <div
                  className="relative flex h-20 w-20 items-center justify-center rounded-full"
                  style={{
                    background: `conic-gradient(#8b5cf6 ${quickInsights.consistency}%, rgba(255,255,255,0.08) 0)`
                  }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-sm font-semibold text-white">
                    {quickInsights.consistency}%
                  </div>
                </div>
                <div>
                  <p className="text-sm text-white/80">Consistency</p>
                  <p className="mt-1 text-xs text-white/60">
                    Days with 40+ min focus
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        <div className="mt-4 md:mt-6">
          <GlassCard className="p-4 md:p-6">
            <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
              Quick Insights Panel
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs text-white/60">Best day</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {quickInsights.bestDay}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs text-white/60">Worst day</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {quickInsights.worstDay}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs text-white/60">Average study</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {quickInsights.avg}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <p className="text-xs text-white/60">Top subject</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {quickInsights.topSubject}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}

export default Dashboard
