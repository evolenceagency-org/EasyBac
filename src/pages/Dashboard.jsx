import { useMemo } from 'react'
import { motion } from 'framer-motion'
import Countdown from '../components/Countdown.jsx'
import DashboardCards from '../components/DashboardCards.jsx'
import StudyTimeChart from '../components/Charts/StudyTimeChart.jsx'
import SubjectChart from '../components/Charts/SubjectChart.jsx'
import WeeklySummary from '../components/WeeklySummary.jsx'
import DashboardTaskSummary from '../components/DashboardTaskSummary.jsx'
import { useData } from '../context/DataContext.jsx'
import {
  calculateCurrentStreak,
  calculateLongestStreak
} from '../utils/streak.js'
import { toDateKey } from '../utils/dateUtils.js'
import { detectWeakSubjects, getDailyStudyData } from '../utils/analytics.js'
import {
  getTasksCompletedToday,
  isOverdueTask
} from '../utils/taskStats.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const getTodayKey = () => toDateKey(new Date())

const Dashboard = () => {
  const { tasks, studySessions, loading, errors } = useData()

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

  const weakSubjects = useMemo(() => detectWeakSubjects(tasks), [tasks])

  const taskSummary = useMemo(() => {
    const completedToday = getTasksCompletedToday(tasks)
    const pending = tasks.filter((task) => !task.completed).length
    const overdue = tasks.filter((task) => isOverdueTask(task)).length
    return { completedToday, pending, overdue }
  }, [tasks])

  const dailyStudyData = useMemo(
    () => getDailyStudyData(studySessions),
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
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Countdown />
        <WeeklySummary sessions={studySessions} />
      </div>

      <DashboardTaskSummary
        completedToday={taskSummary.completedToday}
        pending={taskSummary.pending}
        overdue={taskSummary.overdue}
      />

      {(errors.tasks || errors.sessions) && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errors.tasks || errors.sessions}
        </div>
      )}

      {weakSubjects.length > 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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

      <div className="grid gap-6 lg:grid-cols-2">
        <StudyTimeChart
          data={dailyStudyData}
          title="Daily Study Time"
          subtitle="Last 30 days"
        />
        <SubjectChart />
      </div>
    </motion.div>
  )
}

export default Dashboard





