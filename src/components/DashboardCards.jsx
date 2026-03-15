import { memo } from 'react'
import { motion } from 'framer-motion'

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
      accent: 'bg-emerald-500'
    },
    {
      label: 'Current Streak',
      value: loading ? '...' : `${currentStreak} days`,
      accent: 'bg-rose-500'
    },
    {
      label: 'Longest Streak',
      value: loading ? '...' : `${longestStreak} days`,
      accent: 'bg-emerald-500'
    },
    {
      label: 'Total Study Hours',
      value: loading ? '...' : `${totalHours}h`,
      accent: 'bg-violet-500'
    }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <motion.div
          key={card.label}
          whileHover={{ y: -6 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="card"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">{card.label}</p>
            <span className={`h-2.5 w-2.5 rounded-full ${card.accent}`} />
          </div>
          <p className="mt-4 text-2xl font-semibold text-zinc-900">
            {card.value}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Updated moments ago</p>
        </motion.div>
      ))}
    </div>
  )
}

export default memo(DashboardCards)
