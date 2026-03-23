import { useMemo } from 'react'
import { motion } from 'framer-motion'
import StudyTimeChart from '../components/Charts/StudyTimeChart.jsx'
import SubjectFocusChart from '../components/Charts/SubjectFocusChart.jsx'
import CreativityChart from '../components/Charts/CreativityChart.jsx'
import WeeklyStudyChart from '../components/Charts/WeeklyStudyChart.jsx'
import { useData } from '../context/DataContext.jsx'
import {
  getDailyStudyData,
  getSubjectFocus,
  getDailyCreativity,
  getWeeklyStudyData
} from '../utils/analytics.js'
import GlassCard from '../components/GlassCard.jsx'
import { TrendingUp, Activity, AlertCircle } from 'lucide-react'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const Analytics = () => {
  const { tasks, studySessions, loading, errors } = useData()

  const dailyStudyData = useMemo(
    () => getDailyStudyData(studySessions),
    [studySessions]
  )
  const subjectFocusData = useMemo(() => getSubjectFocus(tasks), [tasks])
  const creativityData = useMemo(
    () => getDailyCreativity(tasks, studySessions),
    [tasks, studySessions]
  )
  const weeklyStudyData = useMemo(
    () => getWeeklyStudyData(studySessions),
    [studySessions]
  )

  const hasData = useMemo(
    () => studySessions.length > 0 || tasks.length > 0,
    [studySessions.length, tasks.length]
  )

  const insightCards = useMemo(() => {
    const dailyValues = dailyStudyData.datasets?.[0]?.data || []
    const dailyLabels = dailyStudyData.labels || []
    const total = dailyValues.reduce((sum, v) => sum + v, 0)
    const avg = dailyValues.length ? Math.round(total / dailyValues.length) : 0
    const maxValue = dailyValues.length ? Math.max(...dailyValues) : 0
    const bestIndex = dailyValues.indexOf(maxValue)
    const bestDay = dailyLabels[bestIndex] || '—'
    const weakSubject =
      subjectFocusData.breakdown?.reduce((min, item) => {
        if (!min || item.value < min.value) return item
        return min
      }, null)?.label || '—'
    const trend =
      weeklyStudyData.datasets?.[0]?.data?.slice(-2) || []
    const trendLabel =
      trend.length === 2 && trend[1] >= trend[0] ? 'Increasing' : 'Decreasing'

    return [
      {
        icon: TrendingUp,
        title: 'Focus Trend',
        value: trendLabel,
        tone: 'from-purple-500/30 to-blue-500/30'
      },
      {
        icon: Activity,
        title: 'Best Day',
        value: bestDay || `${avg} min avg`,
        tone: 'from-emerald-500/30 to-green-500/30'
      },
      {
        icon: AlertCircle,
        title: 'Weak Subject',
        value: weakSubject,
        tone: 'from-amber-500/30 to-orange-500/30'
      }
    ]
  }, [dailyStudyData, subjectFocusData, weeklyStudyData])

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="flex max-w-full flex-col gap-4 md:gap-6"
    >
      <div className="glass rounded-2xl p-4 md:p-6">
        <p className="text-xs uppercase tracking-wide text-white/70">
          Analytics Dashboard
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">
          Study Performance Intelligence
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Analyze your focus, consistency, and efficiency.
        </p>
        <span className="mt-4 block h-[2px] w-32 bg-gradient-to-r from-purple-500 to-blue-500" />
      </div>

      {(errors.tasks || errors.sessions) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.tasks || errors.sessions}
        </div>
      )}

      {(loading.tasks || loading.sessions) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
          Loading analytics...
        </div>
      )}

      {!hasData && (
        <GlassCard className="p-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto flex max-w-md flex-col items-center gap-4"
          >
            <div className="h-16 w-16 rounded-full bg-purple-500/20 blur-2xl" />
            <h4 className="text-lg font-semibold text-white">
              Start studying to unlock insights
            </h4>
            <p className="text-sm text-white/60">
              Your analytics will appear once you log your first sessions.
            </p>
          </motion.div>
        </GlassCard>
      )}

      {hasData && (
        <>
          <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
            <StudyTimeChart
              data={dailyStudyData}
              title="Last 30 Days"
              subtitle="Daily Focus Minutes"
            />
            <CreativityChart
              data={creativityData}
              title="Efficiency Score"
              subtitle="Tasks completed per study hour"
              accentGradient={['#a855f7', '#ec4899']}
            />
            <WeeklyStudyChart
              data={weeklyStudyData}
              title="Weekly Output"
              subtitle="Last 7 days"
            />
            <SubjectFocusChart
              data={subjectFocusData}
              breakdown={subjectFocusData.breakdown}
              centerMode="total"
              totalLabel="Tasks Completed"
              legendVariant="pills"
              title="Subject Mix"
              subtitle="Focus distribution"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {insightCards.map((card) => {
              const Icon = card.icon
              return (
                <GlassCard key={card.title} className="p-5">
                  <div className={`mb-4 h-[2px] w-full bg-gradient-to-r ${card.tone}`} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-white/60">
                        {card.title}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {card.value}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </>
      )}
    </motion.div>
  )
}

export default Analytics

