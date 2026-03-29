import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, BarChart3, Clock3, PieChart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ExamCountdownBanner from '../components/dashboard/ExamCountdownBanner.jsx'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  formatMinutes,
  getDailyStudySeries,
  getExamCountdown,
  getStudyTotals,
  getSubjectBreakdown
} from '../utils/dashboardMetrics.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const Analytics = () => {
  const navigate = useNavigate()
  const { tasks, studySessions } = useData()
  const { profile } = useAuth()

  const countdown = useMemo(() => getExamCountdown(profile), [profile])
  const totals = useMemo(() => getStudyTotals(studySessions), [studySessions])
  const dailyStudy = useMemo(() => getDailyStudySeries(studySessions, 7), [studySessions])
  const subjectBreakdown = useMemo(() => getSubjectBreakdown(tasks, studySessions), [tasks, studySessions])
  const averagePerDay = useMemo(() => {
    if (!dailyStudy.series.length) return 0
    const total = dailyStudy.series.reduce((sum, item) => sum + item.minutes, 0)
    return Math.round(total / dailyStudy.series.length)
  }, [dailyStudy.series])

  const hasData = totals.sessionsCount > 0

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

      <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">Analysis</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">See the study pattern clearly</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
          The goal here is simple: time, sessions, daily rhythm, and subject balance. Nothing extra.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-center gap-3 text-white/55">
            <Clock3 className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.18em]">Total study time</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{formatMinutes(totals.totalMinutes)}</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-center gap-3 text-white/55">
            <Activity className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.18em]">Sessions count</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{totals.sessionsCount}</p>
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-center gap-3 text-white/55">
            <BarChart3 className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.18em]">Daily average</p>
          </div>
          <p className="mt-4 text-3xl font-semibold text-white">{formatMinutes(averagePerDay)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-center gap-3 text-white/55">
            <BarChart3 className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.18em]">Daily graph</p>
          </div>

          {hasData ? (
            <div className="mt-6">
              <div className="flex h-52 items-end gap-3">
                {dailyStudy.series.map((item) => {
                  const height = Math.max(12, (item.minutes / dailyStudy.maxMinutes) * 100)
                  return (
                    <div key={item.key} className="flex flex-1 flex-col items-center gap-3">
                      <div className="w-full max-w-[54px] rounded-t-2xl bg-gradient-to-t from-[#8b5cf6] to-[#c084fc] transition" style={{ height: `${height}%` }} />
                      <div className="text-center">
                        <p className="text-xs font-medium text-white/85">{item.label}</p>
                        <p className="mt-1 text-[11px] text-white/45">{item.minutes}m</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-white/65">
              Start one session and your daily graph will appear here.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-center gap-3 text-white/55">
            <PieChart className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.18em]">Subject breakdown</p>
          </div>

          {subjectBreakdown.length > 0 ? (
            <div className="mt-5 space-y-4">
              {subjectBreakdown.map((item) => {
                const maxMinutes = Math.max(1, subjectBreakdown[0]?.minutes || 1)
                return (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <p className="font-medium text-white">{item.label}</p>
                      <p className="text-white/55">{formatMinutes(item.minutes)}</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/[0.08]">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#6366f1]" style={{ width: `${(item.minutes / maxMinutes) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-white/65">
              Link sessions to tasks and your subject distribution will build itself.
            </div>
          )}
        </section>
      </div>
    </motion.div>
  )
}

export default Analytics
