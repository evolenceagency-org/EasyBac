import { memo } from 'react'

const DashboardTaskSummary = ({ completedToday = 0, pending = 0, overdue = 0 }) => {
  return (
    <div className="glass rounded-2xl p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
        Task Summary
      </p>
      <h3 className="mt-2 text-lg font-semibold">Today at a glance</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-zinc-400">Completed Today</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {completedToday}
          </p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-zinc-400">Pending</p>
          <p className="mt-2 text-xl font-semibold text-white">{pending}</p>
        </div>
        <div className="rounded-xl bg-white/5 px-4 py-3">
          <p className="text-xs text-zinc-400">Overdue</p>
          <p className="mt-2 text-xl font-semibold text-rose-300">
            {overdue}
          </p>
        </div>
      </div>
    </div>
  )
}

export default memo(DashboardTaskSummary)
