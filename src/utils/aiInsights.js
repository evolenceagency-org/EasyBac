const SUBJECT_LABEL_MAP = {
  math: 'Math',
  physics: 'Physics',
  science: 'Science',
  svt: 'Science',
  philosophie: 'Philosophy',
  english: 'Languages',
  languages: 'Languages'
}

const NORMALIZED_SUBJECTS = ['Math', 'Physics', 'Science', 'Languages', 'Philosophy']

const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const isWithinDays = (value, days) => {
  const date = toDate(value)
  if (!date) return false

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  const diffDays = (start - date) / (1000 * 60 * 60 * 24)
  return diffDays >= 0 && diffDays < days
}

const normalizeSubject = (value) => {
  if (!value) return null
  const key = String(value).trim().toLowerCase()
  return SUBJECT_LABEL_MAP[key] || value
}

const unique = (items) => [...new Set(items.filter(Boolean))]

const getTodayDateKey = () => new Date().toISOString().slice(0, 10)

const getSevenDayStats = ({ studySessions = [], tasks = [] }) => {
  const sessions7 = studySessions.filter((session) => isWithinDays(session.date, 7))
  const totalMinutes7 = sessions7.reduce(
    (sum, session) => sum + (session.duration_minutes || 0),
    0
  )
  const avgDailyMinutes7 = Math.round(totalMinutes7 / 7)

  const focusDays7 = unique(sessions7.map((session) => toDate(session.date)?.toISOString().slice(0, 10)))
  const consistencyDays = focusDays7.length

  const recentTasks = tasks.filter(
    (task) => isWithinDays(task.updated_at || task.created_at, 7)
  )
  const completedTasks7 = recentTasks.filter((task) => task.completed)
  const completionRate = recentTasks.length
    ? Math.round((completedTasks7.length / recentTasks.length) * 100)
    : 0

  const subjectCount = completedTasks7.reduce((acc, task) => {
    const subject = normalizeSubject(task.subject)
    if (!subject) return acc
    acc[subject] = (acc[subject] || 0) + 1
    return acc
  }, {})

  return {
    totalMinutes7,
    avgDailyMinutes7,
    consistencyDays,
    completionRate,
    subjectCount
  }
}

const buildWeaknesses = ({ profileData, stats }) => {
  const weaknesses = []

  if (stats.avgDailyMinutes7 < 120) {
    weaknesses.push(`Daily study volume is low (${stats.avgDailyMinutes7} min/day).`)
  }

  if (stats.consistencyDays < 5) {
    weaknesses.push(`Consistency is weak (${stats.consistencyDays}/7 active days).`)
  }

  if (stats.completionRate < 55) {
    weaknesses.push(`Task completion is low (${stats.completionRate}% in the last 7 days).`)
  }

  if (profileData.biggestProblem) {
    weaknesses.push(`Main blocker: ${profileData.biggestProblem}.`)
  }

  const weakSubjects = profileData.weakSubjects || []
  if (weakSubjects.length > 0) {
    weaknesses.push(`Declared weak subjects: ${weakSubjects.join(', ')}.`)
  }

  if (!weaknesses.length) {
    weaknesses.push('No critical weakness detected. Maintain current study structure.')
  }

  return weaknesses.slice(0, 3)
}

const buildPrioritySubjects = ({ profileData, stats }) => {
  const declared = profileData.weakSubjects || []
  const fromStats = Object.keys(stats.subjectCount)
    .sort((a, b) => (stats.subjectCount[a] || 0) - (stats.subjectCount[b] || 0))
    .slice(0, 2)

  const merged = unique([...declared, ...fromStats])
  const filtered = merged.filter((subject) => NORMALIZED_SUBJECTS.includes(subject))

  if (filtered.length) return filtered.slice(0, 3)
  return ['Math', 'Physics']
}

const buildActionPlan = ({ profileData, stats, priorities }) => {
  const plan = []

  if (stats.avgDailyMinutes7 < 120) {
    plan.push('Schedule 2 focused blocks today (60 min each).')
  } else {
    plan.push('Keep today at 2 high-focus blocks (45-60 min each).')
  }

  priorities.slice(0, 2).forEach((subject) => {
    plan.push(`Add one dedicated ${subject} block today (45 min).`)
  })

  if ((profileData.dailyStudyTime || '').includes('Less')) {
    plan.push('Increase total study time by +30 minutes compared to your current average.')
  }

  if (!plan.length) {
    plan.push('Execute one 90-minute deep-work block and close 2 pending tasks today.')
  }

  return unique(plan).slice(0, 4)
}

const buildCorrections = ({ profileData, stats }) => {
  const corrections = []
  const problem = profileData.biggestProblem

  if (problem === 'Lack of focus') {
    corrections.push('Use 45/10 focus cycles and remove phone access during blocks.')
  }
  if (problem === 'Procrastination') {
    corrections.push('Start with a 10-minute entry task before every main session.')
  }
  if (problem === "Don't understand lessons") {
    corrections.push('Spend first 20 minutes on concept review before exercises.')
  }
  if (problem === 'Inconsistent') {
    corrections.push('Fix one daily study start time and protect it for 7 days.')
  }

  if (stats.completionRate < 55) {
    corrections.push('Close at least 2 tasks today before creating new ones.')
  }

  if (stats.consistencyDays < 5) {
    corrections.push('Do one minimum 40-minute session every day this week.')
  }

  if (!corrections.length) {
    corrections.push('Keep current method and increase weekly review quality by 15 minutes.')
  }

  return unique(corrections).slice(0, 4)
}

const sanitizeList = (value, max = 4) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, max)
}

export const analyzeUserData = ({
  studySessions = [],
  tasks = [],
  streak = { current: 0, longest: 0 },
  profile = {}
} = {}) => {
  const personalization = profile?.personalization || {}
  const profileData = {
    level: personalization.level || 'Average',
    weakSubjects: sanitizeList(personalization.weakSubjects, 3).map(normalizeSubject),
    dailyStudyTime: personalization.dailyStudyTime || '',
    mainGoal: personalization.mainGoal || 'Pass',
    biggestProblem: personalization.biggestProblem || ''
  }

  const stats = getSevenDayStats({ studySessions, tasks })
  const weaknesses = buildWeaknesses({ profileData, stats })
  const priorities = buildPrioritySubjects({ profileData, stats })
  const actionPlan = buildActionPlan({ profileData, stats, priorities })
  const corrections = buildCorrections({ profileData, stats })

  return {
    generatedAt: getTodayDateKey(),
    headline: 'Daily performance plan',
    weaknessAnalysis: weaknesses,
    prioritySubjects: priorities,
    dailyActionPlan: actionPlan,
    specificCorrections: corrections,
    metrics: {
      avgDailyMinutes7: stats.avgDailyMinutes7,
      consistencyDays7: stats.consistencyDays,
      completionRate7: stats.completionRate,
      streakCurrent: streak?.current || 0
    }
  }
}

export const buildInsightPrompt = ({
  studySessions = [],
  tasks = [],
  streak = { current: 0, longest: 0 },
  profile = {}
} = {}) => {
  const baseInsight = analyzeUserData({ studySessions, tasks, streak, profile })
  const personalization = profile?.personalization || {}

  return `You are an academic performance analyst. Return strict JSON only with keys: weaknessAnalysis, prioritySubjects, dailyActionPlan, specificCorrections.
Rules:
- Direct and logical tone.
- No motivation, no emotional language, no fluff.
- Every item must be actionable and specific.
- Each array max 4 items.
Input:
Study level: ${personalization.level || 'Average'}
Weak subjects: ${(personalization.weakSubjects || []).join(', ') || 'None'}
Daily study time preference: ${personalization.dailyStudyTime || 'Unknown'}
Main goal: ${personalization.mainGoal || 'Pass'}
Biggest problem: ${personalization.biggestProblem || 'Unknown'}
7-day avg minutes: ${baseInsight.metrics.avgDailyMinutes7}
7-day consistency: ${baseInsight.metrics.consistencyDays7}/7
7-day completion rate: ${baseInsight.metrics.completionRate7}%
Current streak: ${baseInsight.metrics.streakCurrent}
Base insight:
${JSON.stringify(baseInsight)}`
}

const parseJsonFromResponse = (raw) => {
  if (!raw || typeof raw !== 'string') return null

  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const payload = fenced ? fenced[1].trim() : trimmed

  try {
    return JSON.parse(payload)
  } catch {
    return null
  }
}

export const mergeAIInsight = (baseInsight, rawResponse) => {
  const parsed = parseJsonFromResponse(rawResponse)
  if (!parsed || typeof parsed !== 'object') return baseInsight

  const weaknessAnalysis = sanitizeList(parsed.weaknessAnalysis, 4)
  const prioritySubjects = sanitizeList(parsed.prioritySubjects, 4)
  const dailyActionPlan = sanitizeList(parsed.dailyActionPlan, 4)
  const specificCorrections = sanitizeList(parsed.specificCorrections, 4)

  return {
    ...baseInsight,
    weaknessAnalysis: weaknessAnalysis.length
      ? weaknessAnalysis
      : baseInsight.weaknessAnalysis,
    prioritySubjects: prioritySubjects.length
      ? prioritySubjects
      : baseInsight.prioritySubjects,
    dailyActionPlan: dailyActionPlan.length
      ? dailyActionPlan
      : baseInsight.dailyActionPlan,
    specificCorrections: specificCorrections.length
      ? specificCorrections
      : baseInsight.specificCorrections
  }
}

export { getTodayDateKey }
