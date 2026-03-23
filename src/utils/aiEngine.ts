import {
  generateAISnapshot,
  generateScore,
  getTodayDateKey,
  toCanonicalProfile
} from './aiProfiling.js'
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
  const minTime = now.getTime() - days * DAY_MS
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
  if (!dateMs) return Number.POSITIVE_INFINITY
  return Math.floor((now.getTime() - dateMs) / DAY_MS)
}

const getWeeklyTrend = (studySessions = [], now = new Date()) => {
  const currentWindowStart = now.getTime() - 7 * DAY_MS
  const previousWindowStart = now.getTime() - 14 * DAY_MS
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
  const todayKey = toDateKey(now)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = toDateKey(tomorrow)

  const pending = tasks.filter(
    (task) => !(task?.completed === true || task?.status === 'completed')
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

export const getBestTask = (tasks = [], user = null, now = new Date()) => {
  const profile = normalizeUserProfile(user)
  const weakSubjects = new Set(
    (profile?.weakSubjects || []).map((item) => String(item).trim().toLowerCase())
  )
  const todayMs = new Date(toDateKey(now)).getTime()

  const pendingTasks = tasks.filter(
    (task) => !(task?.completed === true || task?.status === 'completed')
  )

  if (pendingTasks.length === 0) return null

  return [...pendingTasks].sort((a, b) => {
    const getScore = (task) => {
      let score = 0
      const dueMs = getTaskDueMs(task)
      const focusMinutes = getTaskFocusMinutes(task)
      const sessionsCount = getTaskSessionsCount(task)
      const subject = String(task?.subject || '').trim().toLowerCase()

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
  const tasks = appData.tasks || []
  const studySessions = appData.studySessions || []
  const timerState = appData.timerState || null
  const profile = normalizeUserProfile(user)
  const scorePayload = generateScore({
    profile,
    tasks,
    studySessions,
    now
  })
  const streak = calculateCurrentStreak(studySessions)
  const weeklyTrend = getWeeklyTrend(studySessions, now)
  const taskSignals = getTaskSignals(tasks, now)
  const lastActivityMs = getLastActivityMs(studySessions, tasks)
  const lastActivityDays = getDaysSince(lastActivityMs, now)
  const activeDays7 = getActiveDays(studySessions, 7, now)
  const personalized = isPersonalized({
    personalization: profile,
    isPersonalized: profile.isPersonalized
  })

  return {
    now,
    todayKey: getTodayDateKey(now),
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
    transientEvent: appData.transientEvent || null
  }
}

export const computeAIScore = (user, appData = {}) => {
  const context = buildMetrics(user, appData, appData.now || new Date())
  const score = clamp(context.scorePayload.score, 0, 100)

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
    profile: context.profile
  }
}

const buildInsightMessage = (context) => {
  const { weeklyTrend, scorePayload, taskSignals, lastActivityDays, profile } = context

  if (lastActivityDays > 2) {
    return {
      short: 'Low consistency',
      full: 'Recent inactivity is lowering momentum and slowing score growth.'
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

  return {
    ...snapshot,
    headline: 'Daily AI update',
    message: insightMessage.short,
    fullMessage: insightMessage.full,
    score: snapshot.score,
    lastUpdated: context.todayKey,
    metadata: {
      streak: context.streak,
      lastActivityDays: context.lastActivityDays,
      weeklyTrend: context.weeklyTrend.percentageDelta,
      weakSubjects: context.profile.weakSubjects
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
    notifications
  } = context
  const aiInsight = generateDailyInsight(profile, {
    tasks: context.tasks,
    studySessions: context.studySessions,
    now: context.now
  })

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

  if (profile.weakSubjects.length > 0) {
    const subject = profile.weakSubjects[0]
    states.push({
      id: 'smart_suggestion',
      type: 'suggestion',
      priority: 30,
      message: `Focus ${subject}`,
      fullMessage: `${subject} is still your highest-impact subject today based on profile and task load.`,
      action: 'start_session',
      metadata: {
        icon: 'sparkles',
        tone: 'neutral',
        actionLabel: 'Start study',
        actionPath: '/study',
        subject
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
  const candidates = buildCandidateStates(context).sort((a, b) => b.priority - a.priority)
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
      lastActivityDays: context.lastActivityDays
    }
  }
}

export const shouldRefreshDailyInsight = (personalization, now = new Date()) => {
  if (!personalization || personalization.isPersonalized !== true) return false
  const lastUpdated = personalization.ai?.lastUpdated || personalization.ai?.lastGenerated || ''
  if (!lastUpdated) return true
  return String(lastUpdated).slice(0, 10) !== getTodayDateKey(now)
}
