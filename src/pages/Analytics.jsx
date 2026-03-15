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
          Analytics
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Study performance</h3>
        <p className="mt-2 text-sm text-zinc-300">
          Track how your focus evolves day by day.
        </p>
      </div>

      {(errors.tasks || errors.sessions) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.tasks || errors.sessions}
        </div>
      )}

      {(loading.tasks || loading.sessions) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          Loading analytics...
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <StudyTimeChart
          data={dailyStudyData}
          title="Daily Study Time"
          subtitle="Last 30 days"
          variant="light"
          containerClassName="rounded-xl bg-white p-6 shadow-card"
        />
        <CreativityChart
          data={creativityData}
          variant="light"
          containerClassName="rounded-xl bg-white p-6 shadow-card"
        />
        <WeeklyStudyChart
          data={weeklyStudyData}
          variant="light"
          containerClassName="rounded-xl bg-white p-6 shadow-card"
        />
        <SubjectFocusChart
          data={subjectFocusData}
          breakdown={subjectFocusData.breakdown}
          variant="light"
          containerClassName="rounded-xl bg-white p-6 shadow-card"
        />
      </div>
    </motion.div>
  )
}

export default Analytics
