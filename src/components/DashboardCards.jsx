import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const DashboardCards = ({
  todayMinutes = 0,
  currentStreak = 0,
  longestStreak = 0,
  totalHours = 0,
  loading
}) => {
  const cards = [
    {
      label: "Today's Study Minutes",
      value: loading ? '...' : `${todayMinutes} min`,
      accent: 'text-emerald-400 bg-emerald-400/90'
    },
    {
      label: 'Current Streak',
      value: loading ? '...' : `${currentStreak} days`,
      accent: 'text-rose-400 bg-rose-400/90'
    },
    {
      label: 'Longest Streak',
      value: loading ? '...' : `${longestStreak} days`,
      accent: 'text-emerald-400 bg-emerald-400/90'
    },
    {
      label: 'Total Study Hours',
      value: loading ? '...' : `${totalHours}h`,
      accent: 'text-violet-400 bg-violet-400/90'
    }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <GlassCard
          key={card.label}
          className="p-4 md:p-5"
        >
          <span className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-purple-400/70 to-blue-400/70" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
              {card.label}
            </p>
            <span
              className={`h-2 w-2 rounded-full ${card.accent}`}
            />
          </div>
          <p className="mt-3 text-xl font-semibold tracking-tight text-white md:text-2xl">
            {card.value}
          </p>
          <p className="mt-2 text-[11px] text-white/45">Updated moments ago</p>
        </GlassCard>
      ))}
    </div>
  )
}

export default memo(DashboardCards)
