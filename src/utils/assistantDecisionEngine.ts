import { getShortMessage } from './aiEngine.ts'
import { detectIntent, executeIntent } from './voiceAssistantEngine.ts'

const DAY_MS = 24 * 60 * 60 * 1000
const MEMORY_PREFIX = 'assistant-decision-memory'
const TASK_REJECTION_SUPPRESS_MS = 8 * 60 * 1000
const GLOBAL_REJECTION_PAUSE_MS = 75 * 1000
const ACCEPT_SUPPRESS_MS = 5 * 60 * 1000
const IGNORE_THRESHOLD_MS = 12 * 1000

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const toNowMs = (now = Date.now()) => {
  if (now instanceof Date) return now.getTime()
  if (typeof now === 'number') return now
  const parsed = new Date(now).getTime()
  return Number.isNaN(parsed) ? Date.now() : parsed
}

const toDayKey = (value = Date.now()) => {
  const ms = toNowMs(value)
  return new Date(ms).toISOString().slice(0, 10)
}

const getDueDayOffset = (task, now = Date.now()) => {
  if (!task?.due_date) return Number.POSITIVE_INFINITY
  const todayKey = toDayKey(now)
  const todayMs = new Date(`${todayKey}T00:00:00`).getTime()
  const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
  if (Number.isNaN(dueMs)) return Number.POSITIVE_INFINITY
  return Math.round((dueMs - todayMs) / DAY_MS)
}

const getTaskPriorityWeight = (priority) => {
  const normalized = String(priority || '').trim().toLowerCase()
  if (normalized === 'high') return 44
  if (normalized === 'medium') return 28
  if (normalized === 'low') return 12

  const numeric = Number(priority)
  if (Number.isFinite(numeric)) return numeric * 10
  return 18
}

const getUrgencyWeight = (task, now) => {
  const offset = getDueDayOffset(task, now)
  if (offset === Number.POSITIVE_INFINITY) return 6
  if (offset < 0) return 82 + Math.abs(offset) * 14
  if (offset === 0) return 68
  if (offset === 1) return 54
  if (offset <= 3) return 40 - offset * 6
  if (offset <= 7) return 22 - (offset - 3) * 3
  return 4
}

const getExamDaysLeft = (profile = {}, now = Date.now()) => {
  const rawValue =
    profile?.exam_date ||
    profile?.examDate ||
    profile?.targetExamDate ||
    profile?.exam?.date ||
    null

  if (!rawValue) return Number.POSITIVE_INFINITY

  const examMs = new Date(rawValue).getTime()
  if (Number.isNaN(examMs)) return Number.POSITIVE_INFINITY

  return Math.max(0, Math.floor((examMs - toNowMs(now)) / DAY_MS))
}

const getTaskDurationMinutes = (task, fallback = 45) => {
  const candidates = [
    task?.duration_minutes,
    task?.durationMinutes,
    task?.estimated_minutes,
    task?.estimatedMinutes,
    task?.planned_minutes,
    task?.plannedMinutes,
    task?.focus_minutes,
    task?.focusMinutes
  ]

  for (const value of candidates) {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric)
    }
  }

  return fallback
}

const getTodayStudyMinutes = (studySessions = [], now = Date.now()) => {
  const todayKey = toDayKey(now)
  return studySessions.reduce((total, session) => {
    const sessionDate =
      session?.completed_at ||
      session?.ended_at ||
      session?.created_at ||
      session?.date ||
      session?.started_at

    if (!sessionDate || toDayKey(sessionDate) !== todayKey) return total
    return total + (Number(session?.duration_minutes ?? session?.durationMinutes ?? session?.duration ?? 0) || 0)
  }, 0)
}

const getMostRecentCompletedSession = (studySessions = [], now = Date.now()) => {
  const recent = [...studySessions]
    .map((session) => {
      const endedAt = session?.completed_at || session?.ended_at || session?.updated_at || session?.created_at || null
      const endedMs = endedAt ? new Date(endedAt).getTime() : Number.NaN
      return {
        session,
        endedMs
      }
    })
    .filter((entry) => Number.isFinite(entry.endedMs) && entry.endedMs <= toNowMs(now))
    .sort((a, b) => b.endedMs - a.endedMs)[0]

  return recent || null
}

const formatTaskActionLabel = (action, task, duration = 45) => {
  const subject = String(task?.subject || 'focus')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
  const taskTitle = String(task?.title || '').trim()

  if (action === 'overdue') {
    return `Finish overdue ${subject} task • ${duration}min`
  }

  if (action === 'first') {
    return `Start first ${subject} session • ${duration}min`
  }

  if (taskTitle) {
    return `Continue ${taskTitle} • ${duration}min`
  }

  return `Continue ${subject} session • ${duration}min`
}

const getOverdueTask = (tasks = [], now = Date.now()) =>
  tasks
    .filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))
    .filter((task) => getDueDayOffset(task, now) < 0)
    .sort((a, b) => {
      const urgencyDelta = getDueDayOffset(a, now) - getDueDayOffset(b, now)
      if (urgencyDelta !== 0) return urgencyDelta
      return getTaskPriorityWeight(b?.priority) - getTaskPriorityWeight(a?.priority)
    })[0] || null

const getWeakSubjects = (profile = {}, studySessions = []) => {
  const profileWeak = Array.isArray(profile?.weakSubjects)
    ? profile.weakSubjects.map((item) => String(item).trim().toLowerCase())
    : []

  const minutesBySubject = studySessions.reduce((acc, session) => {
    const key = String(session?.subject || '').trim().toLowerCase()
    if (!key) return acc
    acc[key] = (acc[key] || 0) + (Number(session?.duration_minutes || 0) || 0)
    return acc
  }, {})

  const sessionSubjects = Object.keys(minutesBySubject)
  if (!sessionSubjects.length) return new Set(profileWeak)

  const averageMinutes =
    sessionSubjects.reduce((sum, subject) => sum + minutesBySubject[subject], 0) /
    Math.max(sessionSubjects.length, 1)

  const weakFromUsage = sessionSubjects.filter((subject) => minutesBySubject[subject] <= averageMinutes * 0.7)
  return new Set([...profileWeak, ...weakFromUsage])
}

const getExamProximityWeight = ({ task, profile, weakSubjects, now }) => {
  const daysLeft = getExamDaysLeft(profile, now)
  if (!Number.isFinite(daysLeft)) return 0

  const dueOffset = getDueDayOffset(task, now)
  const subjectKey = String(task?.subject || '').trim().toLowerCase()
  const weakBoost = weakSubjects.has(subjectKey) ? 1 : 0

  if (daysLeft <= 7) {
    return weakBoost * 18 + (dueOffset <= 3 ? 10 : 4) + (String(task?.priority || '').toLowerCase() === 'high' ? 6 : 0)
  }

  if (daysLeft <= 21) {
    return weakBoost * 12 + (dueOffset <= 3 ? 6 : 2)
  }

  if (daysLeft <= 45) {
    return weakBoost * 8 + (dueOffset <= 1 ? 4 : 0)
  }

  return 0
}

const getRecencyGapWeight = (task, now) => {
  const lastSessionValue = task?.lastSessionAt || task?.last_session_at || null
  if (!lastSessionValue) return 28

  const lastMs = new Date(lastSessionValue).getTime()
  if (Number.isNaN(lastMs)) return 22

  const gapDays = Math.max(0, Math.floor((toNowMs(now) - lastMs) / DAY_MS))
  return clamp(8 + gapDays * 7, 8, 40)
}

const getTaskMemory = (memory, task) => {
  return memory?.tasks?.[task?.id] || { accepted: 0, rejected: 0, ignored: 0, lastRejectedAt: 0, lastAcceptedAt: 0 }
}

const getSubjectMemory = (memory, task) => {
  const subject = String(task?.subject || '').trim().toLowerCase()
  return memory?.subjects?.[subject] || { accepted: 0, rejected: 0, ignored: 0 }
}

const getAdaptiveWeight = (memory, task, now) => {
  const taskMemory = getTaskMemory(memory, task)
  const subjectMemory = getSubjectMemory(memory, task)

  let score = 0
  score += taskMemory.accepted * 10
  score -= taskMemory.rejected * 16
  score -= taskMemory.ignored * 6
  score += subjectMemory.accepted * 4
  score -= subjectMemory.rejected * 8

  if (taskMemory.lastRejectedAt && toNowMs(now) - taskMemory.lastRejectedAt < TASK_REJECTION_SUPPRESS_MS) {
    score -= 140
  }

  if (taskMemory.lastAcceptedAt && toNowMs(now) - taskMemory.lastAcceptedAt < ACCEPT_SUPPRESS_MS) {
    score -= 48
  }

  return score
}

const getCognitiveWeight = (task, cognitiveLoad = {}) => {
  const state = String(cognitiveLoad?.state || '').toLowerCase()
  const priority = String(task?.priority || '').toLowerCase()

  if (state === 'overloaded' || state === 'disengaged' || state === 'struggling') {
    if (priority === 'low') return 16
    if (priority === 'medium') return 8
    if (priority === 'high') return -12
    return 4
  }

  if (state === 'focused') {
    if (priority === 'high') return 8
    if (priority === 'medium') return 4
  }

  return 0
}

const buildTaskReason = (task, { weakSubjects, now }) => {
  const reasons = []
  const offset = getDueDayOffset(task, now)
  const subjectKey = String(task?.subject || '').trim().toLowerCase()

  if (offset < 0) reasons.push('it is overdue')
  else if (offset === 0) reasons.push('it is due today')
  else if (offset === 1) reasons.push('it is due tomorrow')
  else if (offset <= 3) reasons.push('the deadline is close')

  if (String(task?.priority || '').toLowerCase() === 'high') {
    reasons.push('it is high priority')
  }

  if (weakSubjects.has(subjectKey)) {
    reasons.push('this subject needs more repetition')
  }

  if ((Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 0) === 0) {
    reasons.push('you have not started it yet')
  }

  return reasons.slice(0, 2)
}

const getTaskSuggestion = ({
  tasks = [],
  profile = {},
  studySessions = [],
  memory = {},
  cognitiveLoad = {},
  now = Date.now()
}) => {
  const weakSubjects = getWeakSubjects(profile, studySessions)
  const activeTasks = tasks.filter(
    (task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold')
  )

  if (!activeTasks.length) return null

  const ranked = activeTasks
    .map((task) => {
      const subjectKey = String(task?.subject || '').trim().toLowerCase()
      const weaknessWeight = weakSubjects.has(subjectKey) ? 22 : 0
      const score =
        getTaskPriorityWeight(task?.priority) +
        getUrgencyWeight(task, now) +
        weaknessWeight +
        getExamProximityWeight({ task, profile, weakSubjects, now }) +
        getRecencyGapWeight(task, now) +
        getCognitiveWeight(task, cognitiveLoad) +
        getAdaptiveWeight(memory, task, now)

      return {
        task,
        score,
        reasons: buildTaskReason(task, { weakSubjects, now })
      }
    })
    .sort((a, b) => b.score - a.score)

  const selected = ranked[0]
  if (!selected || selected.score < -20) return null

  const subjectLabel = String(selected.task?.subject || 'focus')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
  const durationMinutes = getTaskDurationMinutes(selected.task, 45)
  const shortTitle = formatTaskActionLabel('continue', selected.task, durationMinutes)
  const examDaysLeft = getExamDaysLeft(profile, now)
  const loadState = String(cognitiveLoad?.state || '').toLowerCase()
  const extraReason =
    Number.isFinite(examDaysLeft) && examDaysLeft <= 21
      ? `Your exam is close (${examDaysLeft} day${examDaysLeft === 1 ? '' : 's'} left).`
      : loadState === 'overloaded' || loadState === 'disengaged'
        ? 'This is a lighter next step based on your current load.'
        : ''

  const reasonLine = selected.reasons.length
    ? `Recommended because ${selected.reasons.join(' and ')}.${extraReason ? ` ${extraReason}` : ''}`
    : extraReason || 'Recommended as the strongest next study move.'

  return {
    key: `task:${selected.task.id}`,
    state: 'suggesting',
    origin: 'engine',
    type: 'task',
    aiAction: 'start_focus',
    task: selected.task,
    score: selected.score,
    status: 'AI',
    tone: getDueDayOffset(selected.task, now) < 0 ? 'warning' : 'suggestion',
    title: shortTitle,
    shortMessage: getShortMessage(shortTitle, 24),
    detail: reasonLine,
    action: {
      kind: 'focus_task',
      taskId: selected.task.id,
      durationMinutes,
      path: '/study',
      state: {
        suggestedTaskId: selected.task.id,
        taskId: selected.task.id,
        action: 'start',
        duration: durationMinutes
      }
    }
  }
}

const buildSimpleDecision = ({ key, title, detail, tone = 'suggestion', status = 'AI', type = 'system', action }) => ({
  key,
  state: 'suggesting',
  origin: 'engine',
  type,
  status,
  tone,
  title,
  shortMessage: title,
  detail,
  action
})

const getDecisionActionKey = (decision) => {
  if (decision?.aiAction) return decision.aiAction

  const kind = decision?.action?.kind
  if (kind === 'focus_task') return 'start_focus'
  if (kind === 'break') return 'break'
  if (kind === 'navigate' && decision?.action?.path === '/tasks') return 'reschedule'
  if (kind === 'navigate' && decision?.action?.path === '/study') return 'continue'
  if (kind === 'idle') return 'idle'
  return decision?.type || 'idle'
}

const sanitize = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const hasPhrase = (text = '', phrases = []) => {
  const normalized = sanitize(text)
  return phrases.some((phrase) => normalized.includes(sanitize(phrase)))
}

const getEasierTask = (tasks = [], now = Date.now()) => {
  const activeTasks = tasks.filter(
    (task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold')
  )

  return [...activeTasks]
    .sort((a, b) => {
      const priorityDelta = getTaskPriorityWeight(a?.priority) - getTaskPriorityWeight(b?.priority)
      if (priorityDelta !== 0) return priorityDelta
      return getDueDayOffset(a, now) - getDueDayOffset(b, now)
    })[0] || null
}

export const readAssistantDecisionMemory = (userId) => {
  if (typeof window === 'undefined' || !userId) {
    return {
      tasks: {},
      subjects: {},
      lastAction: null,
      lastAcceptedTaskId: null,
      lastTaskId: null,
      lastAcceptedKey: null,
      lastAcceptedAt: 0,
      lastRejectedKey: null,
      lastRejectedAt: 0,
      acceptedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
      rejectedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
      cooldownUntil: 0
    }
  }

  try {
    const raw = window.localStorage.getItem(`${MEMORY_PREFIX}:${userId}`)
    if (!raw) {
      return {
        tasks: {},
        subjects: {},
        lastAction: null,
        lastAcceptedTaskId: null,
        lastTaskId: null,
        lastAcceptedKey: null,
        lastAcceptedAt: 0,
        lastRejectedKey: null,
        lastRejectedAt: 0,
        acceptedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
        rejectedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
        cooldownUntil: 0
      }
    }

    const parsed = JSON.parse(raw)
    return {
      tasks: parsed?.tasks || {},
      subjects: parsed?.subjects || {},
      lastAction: parsed?.lastAction || null,
      lastAcceptedTaskId: parsed?.lastAcceptedTaskId || null,
      lastTaskId: parsed?.lastTaskId || parsed?.lastAcceptedTaskId || null,
      lastAcceptedKey: parsed?.lastAcceptedKey || null,
      lastAcceptedAt: Number(parsed?.lastAcceptedAt || 0) || 0,
      lastRejectedKey: parsed?.lastRejectedKey || null,
      lastRejectedAt: Number(parsed?.lastRejectedAt || 0) || 0,
      acceptedCounts: {
        start_focus: Number(parsed?.acceptedCounts?.start_focus || 0) || 0,
        break: Number(parsed?.acceptedCounts?.break || 0) || 0,
        reschedule: Number(parsed?.acceptedCounts?.reschedule || 0) || 0,
        continue: Number(parsed?.acceptedCounts?.continue || 0) || 0,
        idle: Number(parsed?.acceptedCounts?.idle || 0) || 0
      },
      rejectedCounts: {
        start_focus: Number(parsed?.rejectedCounts?.start_focus || 0) || 0,
        break: Number(parsed?.rejectedCounts?.break || 0) || 0,
        reschedule: Number(parsed?.rejectedCounts?.reschedule || 0) || 0,
        continue: Number(parsed?.rejectedCounts?.continue || 0) || 0,
        idle: Number(parsed?.rejectedCounts?.idle || 0) || 0
      },
      cooldownUntil: Number(parsed?.cooldownUntil || 0) || 0
    }
  } catch {
    return {
      tasks: {},
      subjects: {},
      lastAction: null,
      lastAcceptedTaskId: null,
      lastTaskId: null,
      lastAcceptedKey: null,
      lastAcceptedAt: 0,
      lastRejectedKey: null,
      lastRejectedAt: 0,
      acceptedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
      rejectedCounts: { start_focus: 0, break: 0, reschedule: 0, continue: 0, idle: 0 },
      cooldownUntil: 0
    }
  }
}

const writeAssistantDecisionMemory = (userId, memory) => {
  if (typeof window === 'undefined' || !userId) return
  window.localStorage.setItem(`${MEMORY_PREFIX}:${userId}`, JSON.stringify(memory))
}

export const recordAssistantDecisionOutcome = (userId, decision, outcome, now = Date.now()) => {
  if (!userId || !decision) return readAssistantDecisionMemory(userId)

  const memory = readAssistantDecisionMemory(userId)
  const nextMemory = {
    ...memory,
    tasks: { ...memory.tasks },
    subjects: { ...memory.subjects },
    acceptedCounts: {
      start_focus: Number(memory?.acceptedCounts?.start_focus || 0) || 0,
      break: Number(memory?.acceptedCounts?.break || 0) || 0,
      reschedule: Number(memory?.acceptedCounts?.reschedule || 0) || 0,
      continue: Number(memory?.acceptedCounts?.continue || 0) || 0,
      idle: Number(memory?.acceptedCounts?.idle || 0) || 0
    },
    rejectedCounts: {
      start_focus: Number(memory?.rejectedCounts?.start_focus || 0) || 0,
      break: Number(memory?.rejectedCounts?.break || 0) || 0,
      reschedule: Number(memory?.rejectedCounts?.reschedule || 0) || 0,
      continue: Number(memory?.rejectedCounts?.continue || 0) || 0,
      idle: Number(memory?.rejectedCounts?.idle || 0) || 0
    },
    lastAction: {
      key: decision.key,
      outcome,
      at: toNowMs(now),
      type: getDecisionActionKey(decision)
    }
  }
  const actionKey = getDecisionActionKey(decision)

  if (outcome === 'accepted' && actionKey in nextMemory.acceptedCounts) {
    nextMemory.acceptedCounts[actionKey] += 1
  }

  if (outcome === 'rejected' && actionKey in nextMemory.rejectedCounts) {
    nextMemory.rejectedCounts[actionKey] += 1
  }

  if (decision.task?.id && outcome === 'accepted') {
    nextMemory.lastTaskId = decision.task.id
  }

  if (decision.task?.id) {
    const taskState = { ...(nextMemory.tasks[decision.task.id] || {}) }
    taskState.accepted = Number(taskState.accepted || 0)
    taskState.rejected = Number(taskState.rejected || 0)
    taskState.ignored = Number(taskState.ignored || 0)

    if (outcome === 'accepted') {
      taskState.accepted += 1
      taskState.lastAcceptedAt = toNowMs(now)
      nextMemory.lastAcceptedTaskId = decision.task.id
      nextMemory.lastAcceptedKey = decision.key
      nextMemory.lastAcceptedAt = toNowMs(now)
      nextMemory.cooldownUntil = 0
    }

    if (outcome === 'rejected') {
      taskState.rejected += 1
      taskState.lastRejectedAt = toNowMs(now)
      nextMemory.lastRejectedKey = decision.key
      nextMemory.lastRejectedAt = toNowMs(now)
      nextMemory.cooldownUntil = toNowMs(now) + GLOBAL_REJECTION_PAUSE_MS
    }

    if (outcome === 'ignored') {
      taskState.ignored += 1
    }

    nextMemory.tasks[decision.task.id] = taskState
  }

  const subjectKey = String(decision.task?.subject || '').trim().toLowerCase()
  if (subjectKey) {
    const subjectState = { ...(nextMemory.subjects[subjectKey] || {}) }
    subjectState.accepted = Number(subjectState.accepted || 0)
    subjectState.rejected = Number(subjectState.rejected || 0)
    subjectState.ignored = Number(subjectState.ignored || 0)

    if (outcome === 'accepted') subjectState.accepted += 1
    if (outcome === 'rejected') subjectState.rejected += 1
    if (outcome === 'ignored') subjectState.ignored += 1

    nextMemory.subjects[subjectKey] = subjectState
  }

  writeAssistantDecisionMemory(userId, nextMemory)
  return nextMemory
}

export const buildAssistantDecision = (context = {}) => {
  const now = toNowMs(context.now)
  const memory = context.memory || readAssistantDecisionMemory(context.userId)
  const currentPage = String(context.currentPage || '').replace(/^\//, '')
  const activeTasks = Array.isArray(context.tasks)
    ? context.tasks.filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))
    : []

  if (context.pendingVoiceDecision) {
    return context.pendingVoiceDecision
  }

  if (context.autopilotActive || currentPage === 'study') {
    return null
  }

  if (context.timerState?.isRunning) {
    return buildSimpleDecision({
      key: 'fallback:continue',
      title: `Continue focus • ${context.timerState.formatted || 'Now'}`,
      detail: 'Resume the current study block.',
      tone: 'active',
      type: 'continue',
      action: {
        kind: 'navigate',
        path: '/study',
        state: { action: 'resume' }
      }
    })
  }

  const urgentOverdueTask = getOverdueTask(activeTasks, now)

  if (memory.cooldownUntil > now && !urgentOverdueTask) {
    return null
  }

  if (!activeTasks.length) {
    return buildSimpleDecision({
      key: 'fallback:idle',
      title: 'Stay ready • Review • 2min',
      detail: 'No active task is available right now.',
      tone: 'neutral',
      type: 'idle',
      action: {
        kind: 'idle'
      }
    })
  }

  const todayStudyMinutes = getTodayStudyMinutes(context.studySessions, now)

  if (todayStudyMinutes <= 0) {
    const firstTask = getTaskSuggestion({
      tasks: activeTasks,
      profile: context.profile,
      studySessions: context.studySessions,
      cognitiveLoad: context.cognitiveLoad,
      memory,
      now
    })

    if (firstTask) {
      return {
        ...firstTask,
        key: `first:${firstTask.task?.id || 'task'}`,
        aiAction: 'start_focus',
        title: formatTaskActionLabel('first', firstTask.task, getTaskDurationMinutes(firstTask.task, 45)),
        shortMessage: formatTaskActionLabel('first', firstTask.task, getTaskDurationMinutes(firstTask.task, 45)),
        detail: 'Start your first study block for today.'
      }
    }
  }

  if (urgentOverdueTask) {
    const durationMinutes = getTaskDurationMinutes(urgentOverdueTask, 45)
    return {
      key: `overdue:${urgentOverdueTask.id}`,
      state: 'suggesting',
      origin: 'engine',
      type: 'task',
      aiAction: 'start_focus',
      task: urgentOverdueTask,
      status: 'AI',
      tone: 'warning',
      title: formatTaskActionLabel('overdue', urgentOverdueTask, durationMinutes),
      shortMessage: formatTaskActionLabel('overdue', urgentOverdueTask, durationMinutes),
      detail: 'This task is already overdue and should be cleared first.',
      action: {
        kind: 'focus_task',
        taskId: urgentOverdueTask.id,
        durationMinutes,
        path: '/study',
        state: {
          suggestedTaskId: urgentOverdueTask.id,
          taskId: urgentOverdueTask.id,
          action: 'start',
          duration: durationMinutes
        }
      }
    }
  }

  return getTaskSuggestion({
    tasks: activeTasks,
    profile: context.profile,
    studySessions: context.studySessions,
    cognitiveLoad: context.cognitiveLoad,
    memory,
    now
  }) || buildSimpleDecision({
    key: 'fallback:idle',
    title: 'Stay ready • Review • 2min',
    detail: 'No stronger study move is available right now.',
    tone: 'neutral',
    type: 'idle',
    action: {
      kind: 'idle'
    }
  })
}

const buildVoiceProposal = ({ key, title, detail, intent, task = null, tone = 'suggestion', type = 'voice' }) => ({
  key,
  state: 'suggesting',
  origin: 'voice',
  type,
  status: 'VOICE',
  tone,
  title,
  shortMessage: getShortMessage(title, 24),
  detail,
  task,
  voiceIntent: intent,
  action: {
    kind: 'voice_intent',
    intent
  }
})

export const buildConfirmationDecision = (result) => {
  if (!result?.requiresConfirmation || !result?.confirmIntent) return null

  return buildVoiceProposal({
    key: `voice:confirm:${result.confirmIntent.type}:${result.confirmIntent.data?.query || 'action'}`,
    title: result.fullMessage || result.message || 'Confirm action',
    detail: 'Swipe right to confirm or left to cancel.',
    intent: result.confirmIntent,
    tone: 'warning',
    type: result.confirmIntent.type || 'voice_confirm'
  })
}

export const resolveVoiceDecision = ({ transcript, tasks = [], studySessions = [], profile, user, now = Date.now() }) => {
  const normalized = sanitize(transcript)
  if (!normalized) {
    return {
      ok: false,
      message: 'I did not catch that.'
    }
  }

  if (hasPhrase(normalized, ['what should i do', 'what now', 'suggest something', 'recommend something'])) {
    const decision = getTaskSuggestion({ tasks, studySessions, profile, memory: {}, now })
    if (!decision) {
      return { ok: false, message: 'You do not have a task to recommend yet.' }
    }
    return {
      ok: true,
      decision: buildVoiceProposal({
        key: `voice:recommend:${decision.key}`,
        title: formatTaskActionLabel('continue', decision.task, getTaskDurationMinutes(decision.task, 45)),
        detail: decision.detail,
        task: decision.task,
        intent: {
          type: 'start_focus',
          data: { query: decision.task?.title || '', subject: decision.task?.subject || '' }
        },
        type: 'voice_recommendation'
      })
    }
  }

  if (hasPhrase(normalized, ["i'm tired", 'im tired', 'i am tired', 'tired', 'need a break', 'too tired'])) {
    const easierTask = getEasierTask(tasks, now)
    if (!easierTask) {
      return {
        ok: true,
        decision: buildVoiceProposal({
          key: 'voice:break',
          title: 'Take a break • Reset • 5min',
          detail: 'You sound tired. A short reset may help before the next session.',
          intent: { type: 'navigate', data: { route: '/dashboard' } },
          tone: 'warning',
          type: 'voice_break'
        })
      }
    }

    return {
      ok: true,
      decision: buildVoiceProposal({
        key: `voice:easy:${easierTask.id}`,
        title: `Start an easier ${String(easierTask.subject || 'focus')} session • ${getTaskDurationMinutes(easierTask, 25)}min`,
        detail: `I can start ${easierTask.title} as a lighter next step.`,
        task: easierTask,
        intent: {
          type: 'start_focus',
          data: { query: easierTask.title, subject: easierTask.subject || '' }
        },
        type: 'voice_easier_task'
      })
    }
  }

  const intent = detectIntent(transcript)
  if (!intent || intent.type === 'unknown') {
    return {
      ok: false,
      message: 'Try things like start math, pause, or what should I do.'
    }
  }

  let title = 'Do you want me to do that?'
  let detail = 'Swipe right to confirm or left to cancel.'
  let matchedTask = null

  if (intent.type === 'pause') {
    title = 'Pause current session'
    detail = 'I will pause the active timer immediately.'
  } else if (intent.type === 'resume') {
    title = 'Resume focus session'
    detail = 'I will reopen study mode and continue the current timer.'
  } else if (intent.type === 'start_focus' || intent.type === 'start_pomodoro' || intent.type === 'start_recommended_task') {
    matchedTask = tasks.find((task) => {
      const query = String(intent.data?.query || intent.data?.subject || '').trim().toLowerCase()
      if (!query) return false
      return String(task?.title || '').toLowerCase().includes(query) || String(task?.subject || '').toLowerCase().includes(query)
    }) || null
    const subject = intent.data?.subject || matchedTask?.subject || 'focus'
    const duration = intent.data?.duration || (intent.type === 'start_pomodoro' ? 45 : 30)
    title = `Start a ${duration}min ${subject} session`
    detail = matchedTask
      ? `This will start focus on ${matchedTask.title}.`
      : 'This will open study mode with your requested session.'
  } else if (intent.type === 'navigate') {
    title = 'Open requested page'
    detail = `I will navigate to ${intent.data?.route || '/dashboard'}.`
  } else if (intent.type === 'complete_task') {
    title = `Mark ${intent.data?.query || 'task'} complete`
    detail = 'I will update the task immediately.'
  } else if (intent.type === 'delete_task') {
    title = `Delete ${intent.data?.query || 'task'}`
    detail = 'This action can be undone only by recreating the task.'
  } else {
    title = 'Run requested action'
    detail = 'Swipe right to confirm or left to cancel.'
  }

  return {
    ok: true,
    decision: buildVoiceProposal({
      key: `voice:${intent.type}:${intent.data?.query || intent.data?.subject || 'action'}`,
      title,
      detail,
      intent,
      task: matchedTask,
      tone: intent.type === 'delete_task' ? 'warning' : 'suggestion',
      type: intent.type
    })
  }
}

export const executeAssistantDecision = async (decision, deps = {}) => {
  if (!decision?.action) return { ok: false, status: 'error', message: 'No action' }

  if (decision.action.kind === 'voice_intent') {
    return executeIntent(decision.action.intent, deps)
  }

  if (decision.action.kind === 'focus_task') {
    deps.navigate?.(decision.action.path || '/study', {
      state: decision.action.state || { suggestedTaskId: decision.task?.id }
    })
    return {
      ok: true,
      status: 'success',
      message: 'Focus started',
      fullMessage: decision.task?.title ? `Opening study for ${decision.task.title}.` : 'Opening study mode.'
    }
  }

  if (decision.action.kind === 'break') {
    return {
      ok: true,
      status: 'success',
      message: 'Break suggested',
      fullMessage: `Take ${decision.action.durationMinutes || 5} minutes to reset before the next session.`
    }
  }

  if (decision.action.kind === 'navigate') {
    deps.navigate?.(decision.action.path || '/dashboard')
    return {
      ok: true,
      status: 'success',
      message: 'Opening',
      fullMessage: 'Opening the next step.'
    }
  }

  if (decision.action.kind === 'idle') {
    return {
      ok: true,
      status: 'success',
      message: 'Ready',
      fullMessage: 'No immediate action is needed right now.'
    }
  }

  if (decision.action.path) {
    deps.navigate?.(decision.action.path, decision.action.state ? { state: decision.action.state } : undefined)
    return {
      ok: true,
      status: 'success',
      message: 'Opening',
      fullMessage: 'Opening the next step.'
    }
  }

  return { ok: false, status: 'error', message: 'Action unavailable' }
}

export const getAssistantIgnoreThreshold = () => IGNORE_THRESHOLD_MS
