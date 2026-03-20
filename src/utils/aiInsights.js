const SUBJECTS = [
  { key: 'math', label: 'Math' },
  { key: 'physics', label: 'Physics' },
  { key: 'svt', label: 'SVT' },
  { key: 'philosophie', label: 'Philosophie' },
  { key: 'english', label: 'English' }
]

const isWithinDays = (value, days) => {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  date.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (today - date) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff < days
}

const getLastNDaysTotalMinutes = (sessions = [], days = 7) =>
  sessions.reduce((total, session) => {
    if (!session?.date || !isWithinDays(session.date, days)) return total
    return total + (session.duration_minutes || 0)
  }, 0)

const getCompletedTasksInDays = (tasks = [], days = 7) =>
  tasks.filter(
    (task) => task.completed && task.created_at && isWithinDays(task.created_at, days)
  )

const getWeakSubject = (tasks = []) => {
  const completed = getCompletedTasksInDays(tasks, 7)
  const total = completed.length
  if (!total) return null

  let weakest = null
  SUBJECTS.forEach((subject) => {
    const count = completed.filter((task) => task.subject === subject.key).length
    const ratio = count / total
    if (ratio < 0.1 && (!weakest || ratio < weakest.ratio)) {
      weakest = { label: subject.label, ratio }
    }
  })

  return weakest ? weakest.label : null
}

const clampScore = (value) => Math.max(0, Math.min(100, value))

const getStatus = (score) => {
  if (score > 80) return 'Excellent'
  if (score > 60) return 'Good'
  return 'Needs Focus'
}

export const analyzeUserData = ({
  studySessions = [],
  tasks = [],
  streak = { current: 0, longest: 0 }
} = {}) => {
  const insights = []
  const totalMinutes = getLastNDaysTotalMinutes(studySessions, 7)
  const averageMinutes = totalMinutes / 7
  const weakSubject = getWeakSubject(tasks)
  const completedTasks = getCompletedTasksInDays(tasks, 7).length
  const studyHours = totalMinutes / 60
  const creativityScore = studyHours > 0 ? completedTasks / studyHours : 0

  let score = 100

  if (averageMinutes < 120) {
    score -= 20
    insights.push({
      type: 'warning',
      title: 'Low Study Time',
      message: "You're below optimal study time.",
      action: 'Add +30min today'
    })
  }

  if ((streak?.current || 0) === 0) {
    score -= 15
    insights.push({
      type: 'streak',
      title: 'Streak Broken',
      message: 'Consistency dropped.',
      action: 'Complete 40min today'
    })
  }

  if (creativityScore > 0 && creativityScore < 1) {
    score -= 10
    insights.push({
      type: 'focus',
      title: 'Low Creativity',
      message: 'You are studying but not completing enough tasks.',
      action: 'Finish 1 task per hour'
    })
  }

  if (weakSubject) {
    score -= 10
    insights.push({
      type: 'focus',
      title: 'Weak Subject Detected',
      message: `${weakSubject} is underrepresented.`,
      action: 'Plan 2 sessions this week'
    })
  }

  if (averageMinutes > 150) {
    insights.push({
      type: 'positive',
      title: 'Great Consistency',
      message: "You're performing above average.",
      action: 'Maintain this rhythm'
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      title: 'Strong Momentum',
      message: 'Your habits are trending in the right direction.',
      action: 'Keep the streak alive'
    })
  }

  const finalScore = clampScore(score)

  return {
    score: finalScore,
    status: getStatus(finalScore),
    insights: insights.slice(0, 5)
  }
}

export const buildInsightPrompt = ({
  studySessions = [],
  tasks = [],
  streak = { current: 0, longest: 0 }
} = {}) => {
  const totalMinutes = getLastNDaysTotalMinutes(studySessions, 7)
  const hours = (totalMinutes / 60).toFixed(1)
  const completed = getCompletedTasksInDays(tasks, 7).length
  const weakSubject = getWeakSubject(tasks) || 'None'
  const creativity = totalMinutes
    ? (completed / (totalMinutes / 60)).toFixed(2)
    : '0'

  return `Analyze this student data and give short actionable advice:
Study hours (last 7 days): ${hours}
Streak: ${streak?.current || 0}
Weak subjects: ${weakSubject}
Creativity score: ${creativity}
Limit response to 3-4 short sentences.`
}
