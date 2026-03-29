import { toDateKey } from './dateUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_PRIORITY = 'medium'
const PRIORITY_ORDER = {
  urgent: 0,
  high: 1,
  medium: 2,
  normal: 2,
  low: 3
}

const dueTime = (value) => {
  if (!value) return Number.POSITIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

export const normalizeTaskPriority = (value) => {
  const normalized = String(value || DEFAULT_PRIORITY).trim().toLowerCase()
  return PRIORITY_ORDER[normalized] !== undefined ? normalized : DEFAULT_PRIORITY
}

export const formatTaskPriority = (value) => {
  const normalized = normalizeTaskPriority(value)
  if (normalized === 'urgent') return 'Urgent'
  if (normalized === 'high') return 'High'
  if (normalized === 'low') return 'Low'
  return 'Medium'
}

export const formatDueLabel = (value) => {
  if (!value) return 'No due date'

  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return 'No due date'

  const today = new Date()
  if (due.toDateString() === today.toDateString()) return 'Due today'

  return `Due ${due.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })}`
}

export const sortTasksByPriorityAndDueDate = (tasks = []) =>
  [...tasks].sort((left, right) => {
    if (Boolean(left.completed) !== Boolean(right.completed)) {
      return left.completed ? 1 : -1
    }

    const leftPriority = PRIORITY_ORDER[normalizeTaskPriority(left.priority)]
    const rightPriority = PRIORITY_ORDER[normalizeTaskPriority(right.priority)]
    if (leftPriority !== rightPriority) return leftPriority - rightPriority

    const leftDue = dueTime(left.due_date)
    const rightDue = dueTime(right.due_date)
    if (leftDue !== rightDue) return leftDue - rightDue

    const leftCreated = dueTime(left.created_at)
    const rightCreated = dueTime(right.created_at)
    return rightCreated - leftCreated
  })

export const getNextActionTask = (tasks = []) =>
  sortTasksByPriorityAndDueDate(tasks).find((task) => !task.completed) || null

export const getTodayTasks = (tasks = [], limit = 5) =>
  sortTasksByPriorityAndDueDate(tasks)
    .filter((task) => !task.completed)
    .slice(0, limit)

export const getTodayStudyMinutes = (studySessions = []) => {
  const todayKey = toDateKey(new Date())
  return studySessions.reduce((total, session) => {
    return toDateKey(session?.date) === todayKey
      ? total + (Number(session?.duration_minutes) || 0)
      : total
  }, 0)
}

export const getStudyTotals = (studySessions = []) => {
  const totalMinutes = studySessions.reduce(
    (total, session) => total + (Number(session?.duration_minutes) || 0),
    0
  )
  const sessionsCount = studySessions.length
  const averageMinutes = sessionsCount > 0 ? Math.round(totalMinutes / sessionsCount) : 0

  return {
    totalMinutes,
    sessionsCount,
    averageMinutes
  }
}

export const formatMinutes = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0))
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60

  if (hours === 0) return `${remainder}m`
  if (remainder === 0) return `${hours}h`
  return `${hours}h ${remainder}m`
}

export const getExamCountdown = (profile) => {
  const rawExamDate = profile?.exam_date || profile?.personalization?.examDate
  if (!rawExamDate) return null

  const examDate = new Date(rawExamDate)
  if (Number.isNaN(examDate.getTime())) return null

  const daysLeft = Math.max(0, Math.ceil((examDate.getTime() - Date.now()) / DAY_MS))
  const progress = Math.max(0, Math.min(100, ((180 - daysLeft) / 180) * 100))
  const urgency = daysLeft <= 14 ? 'high' : daysLeft <= 45 ? 'medium' : 'normal'

  return {
    examDate,
    daysLeft,
    progress,
    urgency,
    formattedDate: examDate.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }
}

export const getDailyStudySeries = (studySessions = [], days = 7) => {
  const totals = new Map()

  studySessions.forEach((session) => {
    const key = toDateKey(session?.date)
    if (!key) return
    totals.set(key, (totals.get(key) || 0) + (Number(session?.duration_minutes) || 0))
  })

  const series = []
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - index)
    date.setHours(0, 0, 0, 0)

    const key = toDateKey(date)
    series.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      shortDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      minutes: totals.get(key) || 0
    })
  }

  const maxMinutes = Math.max(1, ...series.map((item) => item.minutes))
  return { series, maxMinutes }
}

export const getSubjectBreakdown = (tasks = [], studySessions = []) => {
  const taskSubjects = new Map(tasks.map((task) => [task.id, task.subject || 'general']))
  const totals = new Map()

  studySessions.forEach((session) => {
    const taskId = session?.task_id || session?.taskId
    const subject = session?.subject || taskSubjects.get(taskId) || 'general'
    totals.set(subject, (totals.get(subject) || 0) + (Number(session?.duration_minutes) || 0))
  })

  return Array.from(totals.entries())
    .map(([subject, minutes]) => ({
      subject,
      minutes,
      label: subject.charAt(0).toUpperCase() + subject.slice(1)
    }))
    .sort((left, right) => right.minutes - left.minutes)
}
