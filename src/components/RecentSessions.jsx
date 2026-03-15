import { memo } from 'react'

const RecentSessions = ({ sessions = [], loading }) => {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Recent Study Sessions
          </p>
          <h3 className="mt-2 text-lg font-semibold">Last 5 Sessions</h3>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            Loading sessions...
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            No sessions yet. Start your first focus block.
          </div>
        )}

        {!loading &&
          sessions.map((session) => (
            <div
              key={session.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {session.date}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {session.mode === 'pomodoro' ? 'Pomodoro' : 'Free Study'}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs text-zinc-200">
                {session.duration_minutes} min
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

export default memo(RecentSessions)
