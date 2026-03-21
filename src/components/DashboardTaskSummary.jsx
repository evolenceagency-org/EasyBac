import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const DashboardTaskSummary = ({ completedToday = 0, pending = 0, overdue = 0 }) => {
  return (
    <GlassCard className="p-6">
      <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
        Task Summary
      </p>
      <h3 className="text-lg font-semibold text-white">Today at a glance</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <p className="text-xs text-white/70">Completed Today</p>
          <p className="mt-2 text-xl font-semibold text-white">{completedToday}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <p className="text-xs text-white/70">Pending</p>
          <p className="mt-2 text-xl font-semibold text-white">{pending}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
          <p className="text-xs text-white/70">Overdue</p>
          <p className="mt-2 text-xl font-semibold text-rose-300">{overdue}</p>
        </div>
      </div>
    </GlassCard>
  )
}

export default memo(DashboardTaskSummary)
