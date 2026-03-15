import { toDateKey } from './dateUtils.js'

const addDays = (date, amount) => {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export const calculateCurrentStreak = (sessions) => {
  if (!sessions || sessions.length === 0) return 0

  const totals = new Map()
  sessions.forEach((session) => {
    const key = toDateKey(session.date)
    if (!key) return
    const current = totals.get(key) || 0
    totals.set(key, current + (session.duration_minutes || 0))
  })

  const sortedKeys = Array.from(totals.keys()).sort()
  if (sortedKeys.length === 0) return 0

  const earliest = new Date(`${sortedKeys[0]}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let misses = 0
  let foundStreak = false

  for (let date = today; date >= earliest; date = addDays(date, -1)) {
    const key = toDateKey(date)
    const minutes = totals.get(key) || 0

    if (minutes >= 40) {
      streak += 1
      misses = 0
      foundStreak = true
      continue
    }

    misses += 1
    if (!foundStreak && misses >= 2) return 0
    if (foundStreak && misses >= 2) break
  }

  return streak
}

export const calculateLongestStreak = (sessions) => {
  if (!sessions || sessions.length === 0) return 0

  const totals = new Map()
  sessions.forEach((session) => {
    const key = toDateKey(session.date)
    if (!key) return
    const current = totals.get(key) || 0
    totals.set(key, current + (session.duration_minutes || 0))
  })

  const sortedKeys = Array.from(totals.keys()).sort()
  if (sortedKeys.length === 0) return 0

  const earliest = new Date(`${sortedKeys[0]}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let currentStreak = 0
  let longestStreak = 0
  let misses = 0
  let tracking = false

  for (let date = earliest; date <= today; date = addDays(date, 1)) {
    const key = toDateKey(date)
    const minutes = totals.get(key) || 0

    if (minutes >= 40) {
      currentStreak += 1
      misses = 0
      tracking = true
      longestStreak = Math.max(longestStreak, currentStreak)
      continue
    }

    if (!tracking) {
      continue
    }

    misses += 1
    if (misses >= 2) {
      currentStreak = 0
      misses = 0
      tracking = false
    }
  }

  return longestStreak
}
