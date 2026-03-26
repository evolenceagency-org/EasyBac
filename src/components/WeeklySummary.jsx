import { memo } from 'react'
import GlassCard from './GlassCard.jsx'

const WeeklySummary = ({ sessions = [] }) => {
  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getWeekMinutes = (offsetDays) => {
    return sessions.reduce((total, session) => {
      if (!session.date) return total
      const date = new Date(`${session.date}T00:00:00`)
      const diff = (today - date) / (1000 * 60 * 60 * 24)
      if (diff >= offsetDays && diff < offsetDays + 7) {
        return total + (session.duration_minutes || 0)
      }
      return total
    }, 0)
  }

  const thisWeekMinutes = getWeekMinutes(0)
  const lastWeekMinutes = getWeekMinutes(7)

  let comparison = 'This is your first tracked week.'
  if (lastWeekMinutes > 0) {
    const change = Math.round(
      ((thisWeekMinutes - lastWeekMinutes) / lastWeekMinutes) * 100
    )
    comparison = `That is ${change >= 0 ? '+' : ''}${change}% compared to last week.`
  }

  return (
    <GlassCard className="p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
        Weekly Summary
      </p>
      <h3 className="mt-2 text-base font-semibold tracking-tight text-white md:text-lg">
        Your momentum
      </h3>
      <p className="mt-3 text-sm leading-6 text-white/72">
        This week you studied {formatMinutes(thisWeekMinutes)}.
      </p>
      <p className="mt-2 text-sm leading-6 text-white/52">{comparison}</p>
    </GlassCard>
  )
}

export default memo(WeeklySummary)
