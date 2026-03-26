const DAY_MS = 24 * 60 * 60 * 1000

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const LEVEL_POINTS = {
  Good: 30,
  Average: 20,
  Struggling: 10
}

const STUDY_HOUR_POINTS = {
  'Less than 2h': 5,
  '2-4h': 15,
  '4h+': 25
}

const GOAL_POINTS = {
  Pass: 0,
  'Just pass': 0,
  'Good grade': 5,
  'Top score': 10
}

const GOAL_DAILY_HOURS = {
  Pass: 2,
  'Just pass': 2,
  'Good grade': 3,
  'Top score': 4
}

const normalizeWeakSubjects = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map((item) => String(item).trim()))]
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return [fallback.trim()]
  }
  return []
}

const normalizeFocusIssues = (value, fallback = '') => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map((item) => String(item).trim()))]
  }
  if (typeof value === 'string' && value.trim()) {
    return [value.trim()]
  }
  if (typeof fallback === 'string' && fallback.trim()) {
    return [fallback.trim()]
  }
  return []
}

export const getTodayDateKey = (date = new Date()) => {
  return new Date(date).toISOString().slice(0, 10)
}

export const toCanonicalProfile = (rawProfile = {}) => {
  const level = rawProfile.level || 'Average'
  const studyHours = rawProfile.studyHours || rawProfile.dailyStudyTime || '2-4h'
  const goal = rawProfile.goal || rawProfile.mainGoal || 'Good grade'
  const weakSubjects = normalizeWeakSubjects(
    rawProfile.weakSubjects,
    rawProfile.weakestSubject
  )
  const focusIssues = normalizeFocusIssues(
    rawProfile.focusIssues,
    rawProfile.biggestProblem || rawProfile.mainIssue
  )

  const profileEditsRemaining =
    Number.isFinite(rawProfile.profileEditsRemaining) &&
    rawProfile.profileEditsRemaining >= 0
      ? Math.floor(rawProfile.profileEditsRemaining)
      : 1

  return {
    level,
    weakSubjects,
    studyHours,
    goal,
    focusIssues,
    consistency: rawProfile.consistency || '',
    isPersonalized: rawProfile.isPersonalized === true,
    profileEditsRemaining,
    onboardingPath: rawProfile.onboardingPath || '',
    targetScore: rawProfile.targetScore || '',
    weakestSubject: rawProfile.weakestSubject || weakSubjects[0] || '',
    // Keep legacy keys in sync for existing features.
    dailyStudyTime: studyHours,
    mainGoal: goal,
    biggestProblem: focusIssues[0] || ''
  }
}

const toDateMs = (value) => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

const toDateObject = (value = new Date()) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

export const computeStudyMetrics = ({
  tasks = [],
  studySessions = [],
  now = new Date()
} = {}) => {
  const nowDate = toDateObject(now)
  const nowMs = nowDate.getTime()
  const sevenDaysAgo = nowMs - 7 * DAY_MS
  const fourteenDaysAgo = nowMs - 14 * DAY_MS
  const todayKey = getTodayDateKey(nowDate)

  const totalStudyMinutes = studySessions.reduce((sum, session) => {
    return sum + (Number(session?.duration_minutes) || 0)
  }, 0)

  const weeklyStudyMinutes = studySessions.reduce((sum, session) => {
    const sessionMs = toDateMs(session?.date)
    if (!sessionMs || sessionMs < sevenDaysAgo) return sum
    return sum + (Number(session?.duration_minutes) || 0)
  }, 0)

  const activeDaySet = new Set()
  studySessions.forEach((session) => {
    const sessionMs = toDateMs(session?.date)
    if (!sessionMs || sessionMs < fourteenDaysAgo) return
    activeDaySet.add(new Date(sessionMs).toISOString().slice(0, 10))
  })

  const totalTasks = tasks.length
  const completedTasks = tasks.filter(
    (task) => task?.completed === true || task?.status === 'completed'
  ).length
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

  const overdueTasks = tasks.filter((task) => {
    if (!task?.due_date) return false
    if (
      task?.completed === true ||
      task?.status === 'completed' ||
      task?.status === 'on_hold'
    ) {
      return false
    }
    return task.due_date < todayKey
  }).length

  return {
    totalStudyMinutes,
    totalStudyHours: Number((totalStudyMinutes / 60).toFixed(1)),
    weeklyStudyMinutes,
    weeklyStudyHours: Number((weeklyStudyMinutes / 60).toFixed(1)),
    activeDaysLast14: activeDaySet.size,
    totalTasks,
    completedTasks,
    completionRate,
    overdueTasks
  }
}

export const generateScore = ({
  profile,
  tasks = [],
  studySessions = [],
  now = new Date()
} = {}) => {
  const normalizedProfile = toCanonicalProfile(profile)
  const metrics = computeStudyMetrics({ tasks, studySessions, now: toDateObject(now) })

  const weakSubjectPenalty =
    normalizedProfile.weakSubjects.length >= 4
      ? 12
      : normalizedProfile.weakSubjects.length >= 2
        ? 8
        : normalizedProfile.weakSubjects.length === 1
          ? 4
          : 0

  const focusPenalty = Math.min(normalizedProfile.focusIssues.length * 4, 10)

  const baseScore =
    (LEVEL_POINTS[normalizedProfile.level] || 20) +
    (STUDY_HOUR_POINTS[normalizedProfile.studyHours] || 10) +
    (GOAL_POINTS[normalizedProfile.goal] || 0) +
    20 -
    weakSubjectPenalty -
    focusPenalty

  const dynamicAdjustment =
    Math.min(metrics.weeklyStudyHours * 2, 20) +
    metrics.completionRate * 20 +
    Math.min(metrics.activeDaysLast14 * 1.5, 15) -
    Math.min(metrics.overdueTasks * 2, 20)

  const score = clamp(Math.round(baseScore + dynamicAdjustment), 0, 100)

  return {
    score,
    baseScore: clamp(Math.round(baseScore), 0, 100),
    dynamicAdjustment: Number(dynamicAdjustment.toFixed(1)),
    metrics,
    profile: normalizedProfile
  }
}

const buildScoreBandSummary = (score) => {
  if (score >= 80) return 'Execution quality is strong.'
  if (score >= 60) return 'Performance is stable but still improvable.'
  if (score >= 40) return 'Performance is inconsistent and limiting progress.'
  return 'Current execution is below target and needs correction.'
}

export const buildAIAnalysis = ({ scorePayload }) => {
  const { score, profile, metrics } = scorePayload
  const completionRatePct = Math.round(metrics.completionRate * 100)
  const weakSubjectText =
    profile.weakSubjects.length > 0
      ? profile.weakSubjects.join(', ')
      : 'no explicit weak subjects selected'
  const focusIssueText =
    profile.focusIssues.length > 0
      ? profile.focusIssues.join(', ')
      : 'no focus blocker declared'

  return [
    `Your current performance score is ${score}/100. ${buildScoreBandSummary(score)}`,
    `You studied ${metrics.weeklyStudyHours}h in the last 7 days with a ${completionRatePct}% task completion rate. Active days in the last 14 days: ${metrics.activeDaysLast14}.`,
    `Overdue tasks: ${metrics.overdueTasks}. Weak subjects: ${weakSubjectText}. Main blockers: ${focusIssueText}.`
  ].join(' ')
}

export const buildAIActionPlan = ({ scorePayload }) => {
  const { profile, metrics } = scorePayload
  const targetDailyHours = Math.max(
    GOAL_DAILY_HOURS[profile.goal] || 3,
    profile.studyHours === '4h+' ? 4 : profile.studyHours === '2-4h' ? 3 : 2
  )
  const plan = [
    `Study ${targetDailyHours}h/day for the next 7 days with a fixed start time.`,
    `Start each session with ${
      profile.weakSubjects[0] || 'your weakest subject'
    } for at least 60 minutes.`
  ]

  if (metrics.completionRate < 0.75) {
    plan.push('Close at least 2 pending tasks daily before adding new tasks.')
  } else {
    plan.push('Keep task completion above 75% by planning tomorrow before ending today.')
  }

  if (metrics.overdueTasks > 0) {
    plan.push(`Clear ${Math.min(metrics.overdueTasks, 3)} overdue tasks in the next 48 hours.`)
  } else {
    plan.push('Maintain zero-overdue status by scheduling tasks one day earlier than due date.')
  }

  if (metrics.activeDaysLast14 < 8) {
    plan.push('Increase consistency to at least 5 active study days per week.')
  }

  return plan.slice(0, 5)
}

export const generateAISnapshot = ({
  profile,
  tasks = [],
  studySessions = [],
  now = new Date()
} = {}) => {
  const scorePayload = generateScore({ profile, tasks, studySessions, now })
  const analysis = buildAIAnalysis({ scorePayload })
  const plan = buildAIActionPlan({ scorePayload })

  return {
    score: scorePayload.score,
    lastUpdated: getTodayDateKey(now),
    analysis,
    plan,
    metrics: scorePayload.metrics,
    source: 'profiling-engine-v2'
  }
}

export const shouldRefreshAISnapshot = (personalization, now = new Date()) => {
  if (!personalization || personalization.isPersonalized !== true) return false
  const lastUpdated =
    personalization.ai?.lastUpdated ||
    personalization.ai?.lastGenerated ||
    ''
  if (!lastUpdated) return true
  return String(lastUpdated).slice(0, 10) !== getTodayDateKey(now)
}
