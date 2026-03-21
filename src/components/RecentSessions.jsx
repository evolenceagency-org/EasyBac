import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const RecentSessions = ({ sessions = [], loading }) => {
  const getIndicator = (minutes) => {
    if (minutes >= 60) return 'bg-emerald-400 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
    if (minutes >= 30) return 'bg-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
    return 'bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
  }
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-4 text-xs uppercase tracking-wide text-white/70">
            Recent Study Sessions
          </p>
          <h3 className="text-lg font-semibold text-white">Last 5 Sessions</h3>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/70">
            No sessions yet. Start your first focus block.
          </div>
        )}

        {!loading &&
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-3 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)] sm:flex-row sm:items-center sm:justify-between"
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
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white/70">
                {session.duration_minutes} min
              </span>
            </div>
          ))}
      </div>
    </GlassCard>
  )
}

export default memo(RecentSessions)
