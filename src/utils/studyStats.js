import { toDateKey } from './dateUtils.js'

const isWithinDays = (dateKey, days) => {
  const target = new Date(`${dateKey}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (today - target) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < days
}

export const getTodayStudyMinutes = (sessions = []) => {
  const todayKey = toDateKey(new Date())

  return sessions.reduce((total, session) => {
    if (toDateKey(session.date) === todayKey) {
      return total + (session.duration_minutes || 0)
    }
    return total
  }, 0)
}

export const getWeeklyStudyMinutes = (sessions = []) => {
  return sessions.reduce((total, session) => {
    const key = toDateKey(session.date)
    if (key && isWithinDays(key, 7)) {
      return total + (session.duration_minutes || 0)
    }
    return total
  }, 0)
}
