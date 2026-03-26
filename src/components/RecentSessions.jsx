import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const RecentSessions = ({ sessions = [], loading }) => {
  const getIndicator = (minutes) => {
    if (minutes >= 60) return 'bg-emerald-300'
    if (minutes >= 30) return 'bg-amber-300'
    return 'bg-rose-300'
  }
  return (
    <GlassCard className="p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
            Recent Study Sessions
          </p>
          <h3 className="text-lg font-semibold text-white">Last 5 Sessions</h3>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:mt-6">
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white/70">
            No sessions yet. Start your first focus block.
          </div>
        )}

        {!loading &&
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 transition-all duration-200 ease-out hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${getIndicator(session.duration_minutes || 0)}`} />
                  <p className="text-sm font-semibold text-white">{session.date}</p>
                </div>
                <p className="mt-1 text-xs text-white/60">
                  {session.mode === 'pomodoro' ? 'Pomodoro' : 'Free Study'}
                </p>
              </div>
              <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs text-white/70">
                {session.duration_minutes} min
              </span>
            </div>
          ))}
      </div>
    </GlassCard>
  )
}

export default memo(RecentSessions)
