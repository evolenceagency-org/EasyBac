import {
  generateAISnapshot,
  generateScore,
  getTodayDateKey,
  toCanonicalProfile
} from './aiProfiling.js'
import {
  adaptToCognitiveState,
  computeCognitiveLoad
} from './cognitiveLoadEngine.ts'
import {
  buildMemoryGraphSnapshot,
  getMemoryGraphSummary,
  getTaskMemoryBoost
} from './memoryGraph.ts'
import { calculateCurrentStreak } from './streak.js'
import { isPersonalized } from './personalization.js'
import { toDateKey } from './dateUtils.js'

const DAY_MS = 24 * 60 * 60 * 1000

export const getShortMessage = (message, limit = 25) => {
  if (typeof message !== 'string') return ''
  const trimmed = message.trim()
  if (trimmed.length <= limit) return trimmed
  return `${trimmed.slice(0, Math.max(0, limit - 3)).trimEnd()}...`
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toDateObject = (value = new Date()) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

const toTimeMs = (value) => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

const normalizeUserProfile = (user) => {
  if (!user) return toCanonicalProfile({})
  const personalization = user.personalization || user.profile || user
  return toCanonicalProfile(personalization || {})
}

const getActiveDays = (studySessions = [], days = 7, now = new Date()) => {
  const nowDate = toDateObject(now)
  const minTime = nowDate.getTime() - days * DAY_MS
  const daysSet = new Set()

  studySessions.forEach((session) => {
    const sessionMs = toTimeMs(session?.date)
    if (!sessionMs || sessionMs < minTime) return
    const key = new Date(sessionMs).toISOString().slice(0, 10)
    daysSet.add(key)
  })

  return daysSet.size
}

const getLastActivityMs = (studySessions = [], tasks = []) => {
  const sessionTimes = studySessions
    .map((session) => toTimeMs(session?.date))
    .filter(Boolean)

  const taskTimes = tasks
    .map((task) => toTimeMs(task?.updated_at || task?.created_at || task?.due_date))
    .filter(Boolean)

  const all = [...sessionTimes, ...taskTimes]
  if (all.length === 0) return null
  return Math.max(...all)
}

const getDaysSince = (dateMs, now = new Date()) => {
  const nowDate = toDateObject(now)
  if (!dateMs) return Number.POSITIVE_INFINITY
  return Math.floor((nowDate.getTime() - dateMs) / DAY_MS)
}

const getWeeklyTrend = (studySessions = [], now = new Date()) => {
  const nowDate = toDateObject(now)
  const currentWindowStart = nowDate.getTime() - 7 * DAY_MS
  const previousWindowStart = nowDate.getTime() - 14 * DAY_MS
  let currentMinutes = 0
  let previousMinutes = 0

  studySessions.forEach((session) => {
    const sessionMs = toTimeMs(session?.date)
    if (!sessionMs) return

    const minutes = Number(session?.duration_minutes) || 0
    if (sessionMs >= currentWindowStart) {
      currentMinutes += minutes
    } else if (sessionMs >= previousWindowStart) {
      previousMinutes += minutes
    }
  })

  const percentageDelta =
    previousMinutes > 0
      ? Math.round(((currentMinutes - previousMinutes) / previousMinutes) * 100)
      : currentMinutes > 0
        ? 100
        : 0

  return {
    currentMinutes,
    previousMinutes,
    percentageDelta
  }
}

const getTaskSignals = (tasks = [], now = new Date()) => {
  const nowDate = toDateObject(now)
  const todayKey = toDateKey(nowDate)
  const tomorrow = new Date(nowDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = toDateKey(tomorrow)

  const pending = tasks.filter(
    (task) =>
      !(
        task?.completed === true ||
        task?.status === 'completed' ||
        task?.status === 'on_hold'
      )
  )

  const overdue = pending.filter((task) => task?.due_date && task.due_date < todayKey)
  const upcoming = pending.filter(
    (task) => task?.due_date === todayKey || task?.due_date === tomorrowKey
  )

  const completedCount = tasks.filter(
    (task) => task?.completed === true || task?.status === 'completed'
  ).length

  const completionRate = tasks.length > 0 ? completedCount / tasks.length : 0

  return {
    pendingCount: pending.length,
    completedCount,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    urgentSubject:
      overdue[0]?.subject || upcoming[0]?.subject || pending[0]?.subject || null,
    completionRate
  }
}

const getReminderSubject = (subject) => {
  if (!subject) return 'today'
  return String(subject).trim()
}

const getTaskDueMs = (task) => {
  if (!task?.due_date) return null
  const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
  return Number.isNaN(dueMs) ? null : dueMs
}

const getTaskFocusMinutes = (task) =>
  Number(task?.total_focus_time ?? task?.totalFocusTime ?? 0) || 0

const getTaskSessionsCount = (task) =>
  Number(task?.sessions_count ?? task?.sessionsCount ?? 0) || 0

const TIME_WINDOWS = [
  { id: 'morning', label: '07:00–10:00', start: 7, end: 10 },
  { id: 'midday', label: '10:00–14:00', start: 10, end: 14 },
  { id: 'afternoon', label: '14:00–18:00', start: 14, end: 18 },
  { id: 'evening', label: '18:00–21:00', start: 18, end: 21 },
  { id: 'night', label: '21:00–23:00', start: 21, end: 23 }
]

const getSessionMinutes = (session) =>
  Number(session?.duration_minutes ?? session?.durationMinutes ?? 0) || 0

const getSessionTimestampMs = (session) => {
  return (
    toTimeMs(
      session?.endedAt ||
        session?.ended_at ||
        session?.startedAt ||
        session?.started_at ||
        session?.created_at ||
        session?.updated_at
    ) ||
    toTimeMs(session?.date)
  )
}

const getSessionTimeAnchorMs = (session) =>
  toTimeMs(
    session?.endedAt ||
      session?.ended_at ||
      session?.startedAt ||
      session?.started_at ||
      session?.created_at ||
      session?.updated_at
  )

const getWindowForHour = (hour) => {
  const window = TIME_WINDOWS.find((item) => hour >= item.start && hour < item.end)
  return window || TIME_WINDOWS[TIME_WINDOWS.length - 1]
}

const average = (values = []) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const weightedAverage = (values = []) => {
  if (!values.length) return 0
  let numerator = 0
  let denominator = 0
  values.forEach((value, index) => {
    const weight = values.length - index
    numerator += value * weight
    denominator += weight
  })
  return denominator > 0 ? numerator / denominator : 0
}

const getProfileBaseFocusMinutes = (profile) => {
  let base =
    profile.level === 'Good' ? 44 : profile.level === 'Struggling' ? 28 : 36

  if (profile.studyHours === '4h+') base += 6
  if (profile.studyHours === 'Less than 2h') base -= 5
  if ((profile.focusIssues || []).length >= 2) base -= 4

  return clamp(Math.round(base), 20, 60)
}

const getTaskSubjectKey = (task) => String(task?.subject || '').trim().toLowerCase()

const getSubjectLabel = (subject) => {
  if (!subject) return 'General'
  return String(subject)
    .split(/[_-]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const getBestTask = (tasks = [], user = null, now = new Date()) => {
  const profile = normalizeUserProfile(user)
  const nowDate = toDateObject(now)
  const memoryGraph = buildMemoryGraphSnapshot({
    personalization: profile,
    tasks
  })
  const weakSubjects = new Set(
    (profile?.weakSubjects || []).map((item) => String(item).trim().toLowerCase())
  )
  const todayMs = new Date(toDateKey(nowDate)).getTime()

  const pendingTasks = tasks.filter(
    (task) =>
      !(
        task?.completed === true ||
        task?.status === 'completed' ||
        task?.status === 'on_hold'
      )
  )

  if (pendingTasks.length === 0) return null

  return [...pendingTasks].sort((a, b) => {
    const getScore = (task) => {
      let score = 0
      const dueMs = getTaskDueMs(task)
      const focusMinutes = getTaskFocusMinutes(task)
      const sessionsCount = getTaskSessionsCount(task)
      const subject = String(task?.subject || '').trim().toLowerCase()
      const memoryBoost = getTaskMemoryBoost(task, profile, memoryGraph)

      if (dueMs !== null) {
        const daysUntilDue = Math.round((dueMs - todayMs) / DAY_MS)
        if (daysUntilDue < 0) score += 600 + Math.abs(daysUntilDue) * 35
        else if (daysUntilDue === 0) score += 340
        else if (daysUntilDue <= 2) score += 240 - daysUntilDue * 40
        else score += Math.max(0, 90 - daysUntilDue * 8)
      } else {
        score -= 20
      }

      if (weakSubjects.has(subject)) score += 120
      score += memoryBoost.boost
      if (focusMinutes === 0) score += 85
      else score += Math.max(0, 80 - Math.min(focusMinutes, 80))

      if (sessionsCount === 0) score += 30
      else score += Math.max(0, 18 - sessionsCount * 3)

      const priority = Number(task?.priority)
      if (Number.isFinite(priority)) score += priority * 10

      return score
    }

    const scoreDiff = getScore(b) - getScore(a)
    if (scoreDiff !== 0) return scoreDiff

    const dueDiff =
      (getTaskDueMs(a) ?? Number.POSITIVE_INFINITY) -
      (getTaskDueMs(b) ?? Number.POSITIVE_INFINITY)
    if (dueDiff !== 0) return dueDiff

    const focusDiff = getTaskFocusMinutes(a) - getTaskFocusMinutes(b)
    if (focusDiff !== 0) return focusDiff

    return String(a?.title || '').localeCompare(String(b?.title || ''))
  })[0]
}

const buildMetrics = (user, appData = {}, now = new Date()) => {
  const nowDate = toDateObject(now)
  const tasks = appData.tasks || []
  const studySessions = appData.studySessions || []
  const timerState = appData.timerState || null
  const profile = normalizeUserProfile(user)
  const memoryGraph = buildMemoryGraphSnapshot({
    personalization: profile,
    tasks
  })
  const scorePayload = generateScore({
    profile,
    tasks,
    studySessions,
    now: nowDate
  })
  const streak = calculateCurrentStreak(studySessions)
  const weeklyTrend = getWeeklyTrend(studySessions, nowDate)
  const taskSignals = getTaskSignals(tasks, nowDate)
  const lastActivityMs = getLastActivityMs(studySessions, tasks)
  const lastActivityDays = getDaysSince(lastActivityMs, nowDate)
  const activeDays7 = getActiveDays(studySessions, 7, nowDate)
  const personalized = isPersonalized({
    personalization: profile,
    isPersonalized: profile.isPersonalized
  })

  return {
    now: nowDate,
    todayKey: getTodayDateKey(nowDate),
    profile,
    tasks,
    studySessions,
    timerState,
    scorePayload,
    streak,
    weeklyTrend,
    taskSignals,
    lastActivityMs,
    lastActivityDays,
    activeDays7,
    personalized,
    notifications: Array.isArray(appData.notifications) ? appData.notifications : [],
    transientEvent: appData.transientEvent || null,
    memoryGraph
  }
}

const buildPerformanceModel = (context) => {
  const tasksById = new Map(context.tasks.map((task) => [task.id, task]))
  const sessions = context.studySessions
    .map((session) => {
      const minutes = getSessionMinutes(session)
      const timestampMs = getSessionTimestampMs(session)
      if (!minutes || !timestampMs) return null
      return {
        ...session,
        minutes,
        timestampMs,
        timeAnchorMs: getSessionTimeAnchorMs(session),
        hour: new Date(timestampMs).getHours(),
        dayKey: new Date(timestampMs).toISOString().slice(0, 10)
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.timestampMs - a.timestampMs)

  const recentDurations = sessions.slice(0, 12).map((session) => session.minutes)
  const windowStats = Object.fromEntries(
    TIME_WINDOWS.map((window) => [
      window.id,
      { ...window, sessions: 0, totalMinutes: 0, avgMinutes: 0, score: 0 }
    ])
  )
  const subjectStats = {}
  const breakSamples = []

  const sortedAscending = [...sessions].sort((a, b) => a.timestampMs - b.timestampMs)
  for (let index = 1; index < sortedAscending.length; index += 1) {
    const prev = sortedAscending[index - 1]
    const current = sortedAscending[index]
    if (prev.dayKey !== current.dayKey) continue
    const gapMinutes = Math.round((current.timestampMs - prev.timestampMs) / (60 * 1000)) - prev.minutes
    if (gapMinutes >= 3 && gapMinutes <= 90) {
      breakSamples.push(gapMinutes)
    }
  }

  sessions.forEach((session) => {
    if (!session.timeAnchorMs) return
    const window = getWindowForHour(session.hour)
    const bucket = windowStats[window.id]
    bucket.sessions += 1
    bucket.totalMinutes += session.minutes
    bucket.avgMinutes = bucket.totalMinutes / bucket.sessions
    bucket.score = bucket.totalMinutes + bucket.sessions * 8

    const task = tasksById.get(session.taskId)
    const subjectKey = getTaskSubjectKey(task)
    if (!subjectKey) return

    if (!subjectStats[subjectKey]) {
      subjectStats[subjectKey] = {
        subject: getSubjectLabel(task.subject),
        totalMinutes: 0,
        sessions: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        bestWindow: window.label,
        bestWindowScore: 0
      }
    }

    const stat = subjectStats[subjectKey]
    stat.totalMinutes += session.minutes
    stat.sessions += 1
    if (bucket.score > stat.bestWindowScore) {
      stat.bestWindow = window.label
      stat.bestWindowScore = bucket.score
    }
  })

  context.tasks.forEach((task) => {
    const subjectKey = getTaskSubjectKey(task)
    if (!subjectKey) return
    if (!subjectStats[subjectKey]) {
      subjectStats[subjectKey] = {
        subject: getSubjectLabel(task.subject),
        totalMinutes: 0,
        sessions: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        bestWindow: null,
        bestWindowScore: 0
      }
    }

    const stat = subjectStats[subjectKey]
    if (task.completed === true || task.status === 'completed') stat.completedTasks += 1
    else stat.pendingTasks += 1

    const dueMs = getTaskDueMs(task)
    if (
      dueMs !== null &&
      dueMs < new Date(context.todayKey).getTime() &&
      task.completed !== true &&
      task.status !== 'completed' &&
      task.status !== 'on_hold'
    ) {
      stat.overdueTasks += 1
    }
  })

  const bestWindowCandidates = Object.values(windowStats).sort((a, b) => b.score - a.score)
  const bestWindow =
    bestWindowCandidates[0]?.score > 0 ? bestWindowCandidates[0] : TIME_WINDOWS[3]

  return {
    sessions,
    recentDurations,
    averageFocusMinutes: average(recentDurations),
    weightedFocusMinutes: weightedAverage(recentDurations),
    averageBreakMinutes: average(breakSamples),
    bestWindow,
    windowStats,
    subjectStats: Object.values(subjectStats).sort(
      (a, b) => b.totalMinutes + b.completedTasks * 20 - (a.totalMinutes + a.completedTasks * 20)
    ),
    sessionSuccessRate:
      sessions.length > 0
        ? sessions.filter((session) => session.minutes >= 25).length / sessions.length
        : 0
  }
}

export const predictFocusDuration = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const model = buildPerformanceModel(context)
  const baseMinutes = getProfileBaseFocusMinutes(context.profile)
  const predictedMinutes =
    model.recentDurations.length >= 3
      ? clamp(
          Math.round(model.weightedFocusMinutes * 0.78 + baseMinutes * 0.22),
          20,
          75
        )
      : baseMinutes

  return {
    minutes: predictedMinutes,
    label: `${predictedMinutes} min`,
    confidence: model.recentDurations.length >= 6 ? 'high' : model.recentDurations.length >= 3 ? 'medium' : 'low'
  }
}

export const predictDropPoint = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const model = buildPerformanceModel(context)
  const baseMinutes = getProfileBaseFocusMinutes(context.profile) + 6
  const dropPoint =
    model.recentDurations.length >= 3
      ? clamp(Math.round(model.weightedFocusMinutes), 24, 90)
      : clamp(baseMinutes, 24, 70)

  return {
    minutes: dropPoint,
    label: `${dropPoint} min`,
    reason:
      model.recentDurations.length >= 3
        ? `User focus tends to slow after about ${dropPoint} minutes.`
        : `No strong history yet. Using a conservative drop point of ${dropPoint} minutes.`
  }
}

export const predictBestStudyTime = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const model = buildPerformanceModel(context)
  const weakSubjectKey = String(context.profile.weakSubjects?.[0] || '').trim().toLowerCase()
  const weakSubjectWindow = model.subjectStats.find(
    (subject) => String(subject.subject).trim().toLowerCase() === weakSubjectKey
  )?.bestWindow

  const bestWindowLabel = weakSubjectWindow || model.bestWindow.label || '18:00–21:00'
  return {
    window: bestWindowLabel,
    subjectHint: weakSubjectWindow ? getSubjectLabel(context.profile.weakSubjects[0]) : null,
    reason:
      weakSubjectWindow && context.profile.weakSubjects?.length
        ? `${getSubjectLabel(context.profile.weakSubjects[0])} performs best around ${bestWindowLabel}.`
        : `Best performance window is ${bestWindowLabel}.`
  }
}

export const getOptimalSessionLength = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const dropPoint = predictDropPoint(user, appData).minutes
  const model = buildPerformanceModel(context)

  let buffer = context.profile.level === 'Struggling' ? 10 : context.profile.level === 'Good' ? 5 : 7
  if (context.lastActivityDays > 2) buffer += 4
  if (context.activeDays7 >= 5 && model.sessionSuccessRate >= 0.7) buffer -= 2
  if ((context.profile.focusIssues || []).length >= 2) buffer += 2

  const minutes = clamp(Math.round(dropPoint - buffer), 20, 60)
  return {
    minutes,
    label: `${minutes} min`,
    reason: `Recommended session length is ${minutes} minutes because focus typically drops after about ${dropPoint} minutes.`
  }
}

const rankTasksForPlan = (tasks = [], profile, performanceModel, now = new Date()) => {
  const weakSubjects = new Set((profile?.weakSubjects || []).map((item) => String(item).trim().toLowerCase()))
  const todayMs = new Date(toDateKey(now)).getTime()

  return [...tasks]
    .filter(
      (task) =>
        !(
          task?.completed === true ||
          task?.status === 'completed' ||
          task?.status === 'on_hold'
        )
    )
    .sort((a, b) => {
      const scoreTask = (task) => {
        let score = 0
        const dueMs = getTaskDueMs(task)
        const subject = getTaskSubjectKey(task)
        const focusMinutes = getTaskFocusMinutes(task)
        const sessionsCount = getTaskSessionsCount(task)
        const subjectStat = performanceModel.subjectStats.find(
          (item) => String(item.subject).trim().toLowerCase() === subject
        )

        if (dueMs !== null) {
          const daysUntilDue = Math.round((dueMs - todayMs) / DAY_MS)
          if (daysUntilDue < 0) score += 600 + Math.abs(daysUntilDue) * 40
          else if (daysUntilDue === 0) score += 320
          else if (daysUntilDue <= 2) score += 240 - daysUntilDue * 30
          else score += Math.max(0, 100 - daysUntilDue * 8)
        }

        if (weakSubjects.has(subject)) score += 110
        if (focusMinutes === 0) score += 90
        else score += Math.max(0, 70 - Math.min(focusMinutes, 70))
        if (sessionsCount === 0) score += 26
        if (subjectStat?.overdueTasks) score += subjectStat.overdueTasks * 12
        if (subjectStat?.pendingTasks) score += Math.min(subjectStat.pendingTasks * 3, 12)

        return score
      }

      const diff = scoreTask(b) - scoreTask(a)
      if (diff !== 0) return diff
      return String(a?.title || '').localeCompare(String(b?.title || ''))
    })
}

export const generateDailyPlan = (user, tasks = [], appData = {}) => {
  const context = buildMetrics(user, { ...appData, tasks }, appData.now || new Date())
  const performanceModel = buildPerformanceModel(context)
  const bestStudyTime = predictBestStudyTime(user, { ...appData, tasks })
  const optimalSession = getOptimalSessionLength(user, { ...appData, tasks })
  const rankedTasks = rankTasksForPlan(tasks, context.profile, performanceModel, context.now)

  if (rankedTasks.length === 0) {
    return {
      bestStudyTime,
      optimalSessionLength: optimalSession,
      recommendedSession: {
        type: 'study',
        title: 'Free study block',
        subject: context.profile.weakSubjects?.[0] || 'General review',
        duration: optimalSession.minutes,
        reason: 'No pending tasks detected. Use a free session to review your weakest subject.'
      },
      sessions: [
        {
          type: 'study',
          title: 'Free study block',
          subject: context.profile.weakSubjects?.[0] || 'General review',
          duration: optimalSession.minutes,
          reason: 'No pending tasks detected. Use a free session to review your weakest subject.'
        }
      ]
    }
  }

  const recommendedCount =
    context.activeDays7 >= 5 && performanceModel.sessionSuccessRate >= 0.7 ? 3 : 2
  const uniqueTasks = rankedTasks.slice(0, recommendedCount)
  const sessions = []

  uniqueTasks.forEach((task, index) => {
    const subject = getSubjectLabel(task.subject)
    const baseDuration = optimalSession.minutes + (index === 0 ? 0 : index === 1 ? -5 : 5)
    const duration = clamp(baseDuration, 20, 60)
    const dueMs = getTaskDueMs(task)
    const daysUntilDue =
      dueMs !== null ? Math.round((dueMs - new Date(context.todayKey).getTime()) / DAY_MS) : null
    const reason =
      daysUntilDue !== null && daysUntilDue < 0
        ? `${subject} is overdue and should be cleared first.`
        : context.profile.weakSubjects.some(
              (item) => String(item).trim().toLowerCase() === getTaskSubjectKey(task)
            )
          ? `${subject} is a weak subject and needs early attention while energy is high.`
          : `${subject} has lower progress than your other pending work.`

    sessions.push({
      type: 'study',
      taskId: task.id,
      title: task.title || `${subject} task`,
      subject,
      duration,
      reason
    })

    if (index < uniqueTasks.length - 1) {
      sessions.push({
        type: 'break',
        title: 'Break',
        duration: index === 0 ? 5 : 8,
        reason: 'Short reset to protect focus quality.'
      })
    }
  })

  return {
    bestStudyTime,
    optimalSessionLength: optimalSession,
    recommendedSession: sessions.find((item) => item.type === 'study') || null,
    sessions
  }
}

export const computeAIScore = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const score = clamp(context.scorePayload.score, 0, 100)
  const focusPrediction = predictFocusDuration(user, appData)
  const dropPoint = predictDropPoint(user, appData)
  const bestStudyTime = predictBestStudyTime(user, appData)
  const optimalSessionLength = getOptimalSessionLength(user, appData)

  return {
    score,
    lastUpdated: context.todayKey,
    factors: {
      weeklyStudyHours: context.scorePayload.metrics.weeklyStudyHours,
      completionRate: context.scorePayload.metrics.completionRate,
      overdueTasks: context.scorePayload.metrics.overdueTasks,
      activeDaysLast14: context.scorePayload.metrics.activeDaysLast14,
      weakSubjects: context.profile.weakSubjects
    },
    metrics: {
      ...context.scorePayload.metrics,
      streak: context.streak,
      weeklyTrend: context.weeklyTrend.percentageDelta,
      lastActivityDays: context.lastActivityDays,
      activeDays7: context.activeDays7
    },
    profile: context.profile,
    predictions: {
      focusDuration: focusPrediction,
      dropPoint,
      bestStudyTime,
      optimalSessionLength
    }
  }
}

const buildInsightMessage = (context) => {
  const { weeklyTrend, scorePayload, taskSignals, lastActivityDays, profile, memoryGraph } = context
  const graphSummary = getMemoryGraphSummary(memoryGraph || {})

  if (lastActivityDays > 2) {
    return {
      short: 'Low consistency',
      full: 'Recent inactivity is lowering momentum and slowing score growth.'
    }
  }

  if (graphSummary.weakest && graphSummary.weakest.mastery <= 40) {
    return {
      short: `Focus ${graphSummary.weakest.subtopic}`,
      full: `${graphSummary.weakest.label} is currently your weakest concept. Reinforce it before moving to stronger material.`
    }
  }

  if (taskSignals.overdueCount > 0) {
    return {
      short: `${taskSignals.overdueCount} overdue`,
      full: 'Overdue tasks are reducing execution quality and pulling your score down.'
    }
  }

  if (weeklyTrend.percentageDelta <= -10) {
    return {
      short: `Focus ${weeklyTrend.percentageDelta}%`,
      full: `Weekly focus dropped by ${Math.abs(weeklyTrend.percentageDelta)}%. Your recent output is below the previous week.`
    }
  }

  if (profile.weakSubjects.length > 0) {
    const subject = profile.weakSubjects[0]
    return {
      short: `Focus ${subject}`,
      full: `${subject} should be your first priority today based on your profile and current workload.`
    }
  }

  if (scorePayload.metrics.weeklyStudyHours >= 10 && taskSignals.completionRate >= 0.75) {
    return {
      short: 'Strong progress',
      full: 'Study volume and task execution are both strong this week. Keep the same pace.'
    }
  }

  return {
    short: 'Ready to focus',
    full: 'Current data is stable. The next gain comes from one focused session with a clear task.'
  }
}

export const generateDailyInsight = (user, appData = {}) => {
  const now = appData.now || new Date()
  const context = buildMetrics(user, appData, now)
  const snapshot = generateAISnapshot({
    profile: context.profile,
    tasks: context.tasks,
    studySessions: context.studySessions,
    now
  })
  const insightMessage = buildInsightMessage(context)
  const focusDuration = predictFocusDuration(user, { ...appData, now })
  const dropPoint = predictDropPoint(user, { ...appData, now })
  const bestStudyTime = predictBestStudyTime(user, { ...appData, now })
  const optimalSessionLength = getOptimalSessionLength(user, { ...appData, now })
  const dailyPlan = generateDailyPlan(
    user,
    context.tasks,
    { ...appData, studySessions: context.studySessions, now }
  )
  let studyStep = 0
  const planStrings = (dailyPlan.sessions || []).map((item) => {
    if (item.type === 'break') {
      return `Break (${item.duration} min)`
    }
    studyStep += 1
    return `Session ${studyStep}: ${item.subject || 'Study'} (${item.duration} min)`
  })
  const predictiveAnalysis = [
    `Focus usually drops after ${dropPoint.minutes} minutes.`,
    `Best study window: ${bestStudyTime.window}.`,
    `Recommended block length: ${optimalSessionLength.minutes} minutes.`
  ].join(' ')
  const graphSummary = getMemoryGraphSummary(context.memoryGraph || {})

  return {
    ...snapshot,
    headline: 'Daily AI update',
    message: insightMessage.short,
    fullMessage: insightMessage.full,
    analysis: `${snapshot.analysis} ${predictiveAnalysis}`.trim(),
    score: snapshot.score,
    lastUpdated: context.todayKey,
    plan: planStrings.length > 0 ? planStrings : snapshot.plan,
    dailyPlan: dailyPlan.sessions,
    recommendedSession: dailyPlan.recommendedSession,
    predictions: {
      focusDuration,
      dropPoint,
      bestStudyTime,
      optimalSessionLength
    },
    metadata: {
      streak: context.streak,
      lastActivityDays: context.lastActivityDays,
      weeklyTrend: context.weeklyTrend.percentageDelta,
      weakSubjects: context.profile.weakSubjects,
      weakestConcept: graphSummary.weakest || null,
      strongestConcept: graphSummary.strongest || null,
      bestStudyTime: bestStudyTime.window,
      optimalSessionLength: optimalSessionLength.minutes
    },
    source: 'ai-engine-v1'
  }
}

const buildCandidateStates = (context) => {
  const {
    timerState,
    taskSignals,
    lastActivityDays,
    weeklyTrend,
    streak,
    profile,
    personalized,
    notifications,
    cognitiveLoad,
    cognitiveAdaptation
  } = context
  const aiInsight = generateDailyInsight(profile, {
    tasks: context.tasks,
    studySessions: context.studySessions,
    now: context.now
  })
  const predictivePlan = generateDailyPlan(profile, context.tasks, {
    studySessions: context.studySessions,
    now: context.now
  })
  const graphSummary = getMemoryGraphSummary(context.memoryGraph || {})
  const recommendedSession = predictivePlan.recommendedSession
  const isBestWindowNow = (() => {
    const currentHour = context.now.getHours()
    const matchingWindow = TIME_WINDOWS.find(
      (window) => window.label === predictivePlan.bestStudyTime?.window
    )
    if (!matchingWindow) return false
    return currentHour >= matchingWindow.start && currentHour < matchingWindow.end
  })()

  const states = [
    {
      id: 'idle',
      type: 'idle',
      priority: 10,
      message: 'Ready to focus',
      fullMessage: 'Open study or tasks and start the next useful block.',
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: 'neutral',
        actionLabel: 'Start study',
        actionPath: '/study'
      }
    }
  ]

  if (!personalized) {
    states.push({
      id: 'onboarding',
      type: 'suggestion',
      priority: 35,
      message: 'Finish profile',
      fullMessage: 'Complete onboarding so AI guidance can adapt to your real weak subjects and goals.',
      action: 'continue_onboarding',
      metadata: {
        icon: 'brain',
        tone: 'info',
        actionLabel: 'Continue onboarding',
        actionPath: '/personalization'
      }
    })
  }

  if (timerState?.isRunning) {
    states.push({
      id: 'timer_active',
      type: 'timer',
      priority: 100,
      message: `Focus ${timerState.formatted || '00:00'}`,
      fullMessage: 'Active focus session detected. Stay in the current block until it ends.',
      action: 'resume_timer',
      metadata: {
        icon: 'timer',
        tone: 'active',
        actionLabel: 'Resume timer',
        actionPath: '/study'
      }
    })
  }

  if (taskSignals.overdueCount > 0) {
    states.push({
      id: 'overdue_tasks',
      type: 'alert',
      priority: 90,
      message: `${taskSignals.overdueCount} overdue`,
      fullMessage: 'You have overdue work. Complete it first to improve score and reduce pressure.',
      action: 'open_tasks',
      metadata: {
        icon: 'alert',
        tone: 'danger',
        actionLabel: 'Open tasks',
        actionPath: '/tasks',
        overdueCount: taskSignals.overdueCount
      }
    })
  }

  if (taskSignals.upcomingCount > 0) {
    states.push({
      id: 'upcoming_deadlines',
      type: 'alert',
      priority: 80,
      message: `${taskSignals.upcomingCount} due soon`,
      fullMessage: `Upcoming deadline for ${getReminderSubject(taskSignals.urgentSubject)} needs attention in the next 48 hours.`,
      action: 'open_tasks',
      metadata: {
        icon: 'list',
        tone: 'warning',
        actionLabel: 'Open tasks',
        actionPath: '/tasks'
      }
    })
  }

  if (lastActivityDays > 2 && Number.isFinite(lastActivityDays)) {
    states.push({
      id: 'low_consistency',
      type: 'alert',
      priority: 70,
      message: 'Low consistency',
      fullMessage: 'You have been inactive for more than 2 days. Start one study block today to recover momentum.',
      action: 'start_session',
      metadata: {
        icon: 'alert',
        tone: 'warning',
        actionLabel: 'Start session',
        actionPath: '/study'
      }
    })
  }

  if (cognitiveLoad?.state === 'overloaded') {
    states.push({
      id: 'cognitive_overloaded',
      type: 'alert',
      priority: 78,
      message: cognitiveLoad.message || 'Overloaded',
      fullMessage:
        cognitiveAdaptation?.fullMessage ||
        cognitiveLoad.fullMessage ||
        'The user is overloaded. Suggest a short break and lower the next block.',
      action: 'break',
      metadata: {
        icon: 'alert',
        tone: cognitiveAdaptation?.tone || 'danger',
        actionLabel: 'Take break',
        actionPath: '/study',
        cognitiveLoad,
        cognitiveAdaptation
      }
    })
  }

  if (cognitiveLoad?.state === 'struggling') {
    states.push({
      id: 'cognitive_struggling',
      type: 'suggestion',
      priority: 66,
      message: cognitiveLoad.message || 'Struggling',
      fullMessage:
        cognitiveAdaptation?.fullMessage ||
        cognitiveLoad.fullMessage ||
        'Switch to an easier task or shorten the next session.',
      action: 'switch_task',
      metadata: {
        icon: 'sparkles',
        tone: cognitiveAdaptation?.tone || 'warning',
        actionLabel: 'Switch task',
        actionPath: '/study',
        cognitiveLoad,
        cognitiveAdaptation
      }
    })
  }

  if (cognitiveLoad?.state === 'disengaged') {
    states.push({
      id: 'cognitive_disengaged',
      type: 'suggestion',
      priority: 57,
      message: cognitiveLoad.message || 'Re-engage',
      fullMessage:
        cognitiveAdaptation?.fullMessage ||
        cognitiveLoad.fullMessage ||
        'The user appears disconnected. Prompt a short re-entry session.',
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: cognitiveAdaptation?.tone || 'warning',
        actionLabel: 'Start session',
        actionPath: '/study',
        cognitiveLoad,
        cognitiveAdaptation
      }
    })
  }

  if (weeklyTrend.percentageDelta <= -10) {
    states.push({
      id: 'performance_drop',
      type: 'insight',
      priority: 60,
      message: `Focus ${weeklyTrend.percentageDelta}%`,
      fullMessage: `Weekly focus dropped by ${Math.abs(weeklyTrend.percentageDelta)}%. Review analytics and correct the next study block.`,
      action: 'view_stats',
      metadata: {
        icon: 'brain',
        tone: 'info',
        actionLabel: 'View analytics',
        actionPath: '/analytics'
      }
    })
  }

  if (context.todayKey === aiInsight.lastUpdated) {
    states.push({
      id: 'ai_insight',
      type: 'insight',
      priority: 55,
      message: getShortMessage(aiInsight.message),
      fullMessage: aiInsight.fullMessage,
      action: 'view_insight',
      metadata: {
        icon: 'brain',
        tone: 'info',
        actionLabel: 'View insight',
        actionPath: '/ai-result',
        ai: aiInsight
      }
    })
  }

  if (streak >= 3) {
    states.push({
      id: 'study_streak',
      type: 'suggestion',
      priority: 45,
      message: `${streak} day streak`,
      fullMessage: `You have a ${streak}-day streak. Keep today active to protect it.`,
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: 'success',
        actionLabel: 'Keep going',
        actionPath: '/study'
      }
    })
  }

  if (
    weeklyTrend.percentageDelta >= 10 &&
    taskSignals.completionRate >= 0.7 &&
    context.activeDays7 >= 4
  ) {
    states.push({
      id: 'good_progress',
      type: 'suggestion',
      priority: 44,
      message: 'Strong progress',
      fullMessage: 'Recent study time, consistency, and completion rate are all moving in the right direction.',
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: 'success',
        actionLabel: 'Keep going',
        actionPath: '/study'
      }
    })
  }

  if (profile.weakSubjects.length > 0 || graphSummary.weakest) {
    const subject = graphSummary.weakest?.subtopic || graphSummary.weakest?.topic || profile.weakSubjects[0]
    states.push({
      id: 'smart_suggestion',
      type: 'suggestion',
      priority: 30,
      message: `Focus ${subject}`,
      fullMessage: graphSummary.weakest
        ? `${graphSummary.weakest.label} is currently the weakest concept and should be prioritized today.`
        : `${subject} is still your highest-impact subject today based on profile and task load.`,
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: 'neutral',
        actionLabel: 'Start study',
        actionPath: '/study',
        subject,
        weakestConcept: graphSummary.weakest || null
      }
    })
  }

  if (recommendedSession) {
    const sessionLabel = `${recommendedSession.subject || 'Study'} ${recommendedSession.duration}m`
    states.push({
      id: 'predictive_plan',
      type: 'suggestion',
      priority: isBestWindowNow ? 50 : 43,
      message: getShortMessage(sessionLabel),
      fullMessage: isBestWindowNow
        ? `Your best study window is active now. Start ${recommendedSession.title} for ${recommendedSession.duration} minutes. ${recommendedSession.reason}`
        : `Best study window is ${predictivePlan.bestStudyTime?.window}. Start ${recommendedSession.title} for ${recommendedSession.duration} minutes when that window opens. ${recommendedSession.reason}`,
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: isBestWindowNow ? 'success' : 'info',
        actionLabel: 'Start session',
        actionPath: '/study',
        recommendedSession,
        actionState: {
          taskId: recommendedSession.taskId || null,
          mode: 'pomodoro',
          duration: recommendedSession.duration,
          action: 'start'
        }
      }
    })
  }

  if (taskSignals.pendingCount > 0 && taskSignals.upcomingCount === 0 && taskSignals.overdueCount === 0) {
    states.push({
      id: 'next_action',
      type: 'suggestion',
      priority: 24,
      message: `Do ${getReminderSubject(taskSignals.urgentSubject)}`,
      fullMessage: `The next useful move is to work on ${getReminderSubject(taskSignals.urgentSubject)} before opening anything new.`,
      action: 'open_tasks',
      metadata: {
        icon: 'list',
        tone: 'neutral',
        actionLabel: 'Open tasks',
        actionPath: '/tasks'
      }
    })
  }

  if (taskSignals.pendingCount === 0) {
    states.push({
      id: 'no_tasks_today',
      type: 'suggestion',
      priority: 20,
      message: 'No tasks today',
      fullMessage: 'Add one meaningful task so your next session has a concrete target.',
      action: 'open_tasks',
      metadata: {
        icon: 'list',
        tone: 'neutral',
        actionLabel: 'Plan tasks',
        actionPath: '/tasks'
      }
    })
  }

  if (notifications.length > 0) {
    const latestNotification = notifications[0]
    states.push({
      id: 'notification',
      type: 'alert',
      priority: 34,
      message: getShortMessage(latestNotification?.title || latestNotification?.message || 'New update'),
      fullMessage:
        latestNotification?.message ||
        latestNotification?.title ||
        'A new update needs your attention.',
      action: latestNotification?.action || 'open_tasks',
      metadata: {
        icon: latestNotification?.icon || 'alert',
        tone: latestNotification?.tone || 'info',
        actionLabel: latestNotification?.actionLabel || 'Open',
        actionPath: latestNotification?.actionPath || '/dashboard'
      }
    })
  }

  return states
}

const eventToState = (event) => {
  if (!event) return null

  const map = {
    timer_started: {
      id: 'timer_started',
      type: 'timer',
      priority: 99,
      message: 'Session on',
      fullMessage: 'Focus session started and is now active in the background.',
      action: 'resume_timer',
      metadata: {
        icon: 'timer',
        tone: 'active',
        actionLabel: 'Resume timer',
        actionPath: '/study'
      }
    },
    timer_paused: {
      id: 'timer_paused',
      type: 'suggestion',
      priority: 52,
      message: 'Session paused',
      fullMessage: 'Resume the paused session soon or close it cleanly to keep momentum stable.',
      action: 'resume_timer',
      metadata: {
        icon: 'timer',
        tone: 'warning',
        actionLabel: 'Resume timer',
        actionPath: '/study'
      }
    },
    task_completed: {
      id: 'task_completed',
      type: 'suggestion',
      priority: 51,
      message: 'Task done',
      fullMessage: 'A task was completed. Move directly to the next useful item while momentum is high.',
      action: 'open_tasks',
      metadata: {
        icon: 'list',
        tone: 'success',
        actionLabel: 'Open tasks',
        actionPath: '/tasks'
      }
    },
    score_updated: {
      id: 'score_updated',
      type: 'insight',
      priority: 56,
      message: 'Score updated',
      fullMessage: 'Your daily AI score refreshed from the latest study and task activity.',
      action: 'view_insight',
      metadata: {
        icon: 'brain',
        tone: 'info',
        actionLabel: 'View insight',
        actionPath: '/ai-result'
      }
    }
  }

  return map[event.type] || null
}

export const generateAssistantState = (user, appData = {}) => {
  const now = appData.now || new Date()
  const context = buildMetrics(user, appData, now)
  const cognitiveLoad = computeCognitiveLoad(user, {
    tasks: context.tasks,
    studySessions: context.studySessions,
    timerState: context.timerState,
    cognitiveTelemetry: appData.cognitiveTelemetry,
    userId: appData.userId || user?.id || user?.userId,
    sessionMinutes: appData.sessionMinutes,
    inactivitySeconds: appData.inactivitySeconds,
    expectedSessionMinutes: appData.expectedSessionMinutes,
    pauseCount: appData.pauseCount,
    taskSwitchCount: appData.taskSwitchCount,
    interruptionCount: appData.interruptionCount,
    rapidInteractionCount: appData.rapidInteractionCount,
    now
  })
  const cognitiveAdaptation = adaptToCognitiveState(cognitiveLoad, {
    autopilotActive: Boolean(appData.autopilotState?.active || appData.autopilotActive),
    now
  })
  const predictivePlan = generateDailyPlan(user, context.tasks, {
    studySessions: context.studySessions,
    now
  })
  const predictions = {
    focusDuration: predictFocusDuration(user, { ...appData, now }),
    dropPoint: predictDropPoint(user, { ...appData, now }),
    bestStudyTime: predictBestStudyTime(user, { ...appData, now }),
    optimalSessionLength: getOptimalSessionLength(user, { ...appData, now })
  }
  const candidates = buildCandidateStates({
    ...context,
    cognitiveLoad,
    cognitiveAdaptation
  }).sort((a, b) => b.priority - a.priority)
  const baseState = candidates[0]
  const eventState = eventToState(context.transientEvent)

  const state =
    eventState && eventState.priority > baseState.priority ? eventState : baseState

  return {
    ...state,
    message: getShortMessage(state.message),
    metadata: {
      ...state.metadata,
      score: context.scorePayload.score,
      streak: context.streak,
      weeklyTrend: context.weeklyTrend.percentageDelta,
      lastActivityDays: context.lastActivityDays,
      memoryGraph: context.memoryGraph,
      predictions,
      dailyPlan: predictivePlan.sessions,
      recommendedSession: state.metadata?.recommendedSession || predictivePlan.recommendedSession,
      cognitiveLoad,
      cognitiveAdaptation
    }
  }
}

export const shouldRefreshDailyInsight = (personalization, now = new Date()) => {
  if (!personalization || personalization.isPersonalized !== true) return false
  const lastUpdated = personalization.ai?.lastUpdated || personalization.ai?.lastGenerated || ''
  if (!lastUpdated) return true
  return String(lastUpdated).slice(0, 10) !== getTodayDateKey(now)
}
