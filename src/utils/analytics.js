import { getTasksCompletedToday } from './taskStats.js'
import { toDateKey } from './dateUtils.js'

const SUBJECTS = [
  { key: 'math', label: 'Math', color: '#8b5cf6' },
  { key: 'physics', label: 'Physics', color: '#3b82f6' },
  { key: 'svt', label: 'SVT', color: '#22c55e' },
  { key: 'philosophie', label: 'Philosophie', color: '#facc15' },
  { key: 'english', label: 'English', color: '#ec4899' }
]

const getLastNDays = (days) => {
  const dates = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    dates.push(date)
  }
  return dates
}

const isWithinDays = (value, days) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (today - date) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < days
}

export const getDailyStudyData = (studySessions = []) => {
  const totals = new Map()
  studySessions.forEach((session) => {
    const key = toDateKey(session.date)
    if (!key) return
    totals.set(key, (totals.get(key) || 0) + (session.duration_minutes || 0))
  })

  const dates = getLastNDays(30)
  const labels = dates.map((date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )
  const data = dates.map((date) => totals.get(toDateKey(date)) || 0)

  return {
    labels,
    datasets: [
      {
        label: 'Study Minutes',
        data,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.18)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#8b5cf6',
        pointBorderWidth: 0
      }
    ]
  }
}

export const getSubjectFocus = (tasks = []) => {
  const completed = tasks.filter((task) => task.completed)
  const counts = SUBJECTS.map((subject) => {
    const total = completed.filter((task) => task.subject === subject.key).length
    return { ...subject, value: total }
  })

  return {
    labels: counts.map((item) => item.label),
    datasets: [
      {
        data: counts.map((item) => item.value),
        backgroundColor: counts.map((item) => item.color),
        borderWidth: 0,
        hoverOffset: 6,
        cutout: '65%'
      }
    ],
    breakdown: counts
  }
}

export const getDailyCreativity = (tasks = [], studySessions = []) => {
  const studyTotals = new Map()
  studySessions.forEach((session) => {
    const key = toDateKey(session.date)
    if (!key) return
    studyTotals.set(key, (studyTotals.get(key) || 0) + (session.duration_minutes || 0))
  })

  const taskTotals = new Map()
  const completedToday = getTasksCompletedToday(tasks)
  tasks
    .filter((task) => task.completed)
    .forEach((task) => {
      const key = toDateKey(task.created_at)
      if (!key) return
      taskTotals.set(key, (taskTotals.get(key) || 0) + 1)
    })

  const todayKey = toDateKey(new Date())
  if (todayKey) {
    taskTotals.set(todayKey, completedToday)
  }

  const dates = getLastNDays(30)
  const labels = dates.map((date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  )
  const data = dates.map((date) => {
    const key = toDateKey(date)
    const minutes = studyTotals.get(key) || 0
    const hours = minutes / 60
    const completed = taskTotals.get(key) || 0
    if (hours === 0) return 0
    return Number((completed / hours).toFixed(2))
  })

  return {
    labels,
    datasets: [
      {
        label: 'Creativity Score',
        data,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.18)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#22c55e',
        pointBorderWidth: 0
      }
    ]
  }
}

export const getWeeklyStudyData = (studySessions = []) => {
  const totals = new Map()
  studySessions.forEach((session) => {
    const key = toDateKey(session.date)
    if (!key) return
    totals.set(key, (totals.get(key) || 0) + (session.duration_minutes || 0))
  })

  const dates = getLastNDays(7)
  const labels = dates.map((date) =>
    date.toLocaleDateString('en-US', { weekday: 'short' })
  )
  const data = dates.map((date) => totals.get(toDateKey(date)) || 0)

  return {
    labels,
    datasets: [
      {
        label: 'Weekly Minutes',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.35)',
        borderRadius: 10,
        borderSkipped: false
      }
    ]
  }
}

export const getAverageStudyHours = (studySessions = []) => {
  const totals = studySessions.reduce((total, session) => {
    if (!session.date) return total
    if (!isWithinDays(session.date, 30)) return total
    return total + (session.duration_minutes || 0)
  }, 0)

  return Number((totals / 60 / 30).toFixed(2))
}

export const detectWeakSubjects = (tasks = []) => {
  const recent = tasks.filter(
    (task) => task.completed && task.created_at && isWithinDays(task.created_at, 7)
  )

  const total = recent.length
  if (total === 0) return []

  return SUBJECTS.filter((subject) => {
    const count = recent.filter((task) => task.subject === subject.key).length
    return count / total < 0.1
  }).map(
    (subject) => `Your study focus on ${subject.label} is low this week.`
  )
}

export const SUBJECT_COLORS = SUBJECTS
