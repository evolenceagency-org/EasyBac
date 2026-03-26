import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const DashboardTaskSummary = ({ completedToday = 0, pending = 0, overdue = 0 }) => {
  return (
    <GlassCard className="p-4 md:p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/55">
        Task Summary
      </p>
      <h3 className="text-base font-semibold tracking-tight text-white md:text-lg">
        Today at a glance
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 backdrop-blur-md">
          <p className="text-[11px] text-white/55">Completed Today</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-white">{completedToday}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 backdrop-blur-md">
          <p className="text-[11px] text-white/55">Pending</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-white">{pending}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 px-4 py-3 backdrop-blur-md">
          <p className="text-[11px] text-white/55">Overdue</p>
          <p className="mt-1.5 text-lg font-semibold tracking-tight text-rose-300">{overdue}</p>
        </div>
      </div>
    </GlassCard>
  )
}

export default memo(DashboardTaskSummary)
