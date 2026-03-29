import { getShortMessage } from './aiEngine.ts'
import { isOverdueTask } from './taskStats.js'
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

export const normalizeAssistantDecisionMemory = (memory = {}) => ({
  tasks: memory?.tasks || {},
  subjects: memory?.subjects || {},
  lastAction: memory?.lastAction || null,
  lastAcceptedTaskId: memory?.lastAcceptedTaskId || null,
  lastTaskId: memory?.lastTaskId || memory?.lastAcceptedTaskId || null,
  lastAcceptedKey: memory?.lastAcceptedKey || null,
  lastAcceptedAt: Number(memory?.lastAcceptedAt || 0) || 0,
  lastRejectedKey: memory?.lastRejectedKey || null,
  lastRejectedAt: Number(memory?.lastRejectedAt || 0) || 0,
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
  cooldownUntil: Number(memory?.cooldownUntil || 0) || 0
})

const mergeNumericRecords = (left = {}, right = {}) => {
  const merged = { ...left }
  for (const [key, value] of Object.entries(right || {})) {
    merged[key] = Math.max(Number(merged[key] || 0) || 0, Number(value || 0) || 0)
  }
  return merged
}

const mergeNestedMemoryMaps = (left = {}, right = {}) => {
  const merged = { ...left }

  for (const [key, value] of Object.entries(right || {})) {
    const current = merged[key] || {}
    merged[key] = mergeNumericRecords(current, value || {})
  }

  return merged
}

export const mergeAssistantDecisionMemory = (localMemory = {}, remoteMemory = {}) => {
  const local = normalizeAssistantDecisionMemory(localMemory)
  const remote = normalizeAssistantDecisionMemory(remoteMemory)

  return {
    tasks: mergeNestedMemoryMaps(local.tasks, remote.tasks),
    subjects: mergeNestedMemoryMaps(local.subjects, remote.subjects),
    lastAction:
      (Number(remote?.lastAction?.at || 0) || 0) > (Number(local?.lastAction?.at || 0) || 0)
        ? remote.lastAction
        : local.lastAction,
    lastAcceptedTaskId: remote.lastAcceptedAt > local.lastAcceptedAt ? remote.lastAcceptedTaskId : local.lastAcceptedTaskId,
    lastTaskId: remote.lastAcceptedAt > local.lastAcceptedAt ? remote.lastTaskId : local.lastTaskId,
    lastAcceptedKey: remote.lastAcceptedAt > local.lastAcceptedAt ? remote.lastAcceptedKey : local.lastAcceptedKey,
    lastAcceptedAt: Math.max(local.lastAcceptedAt, remote.lastAcceptedAt),
    lastRejectedKey: remote.lastRejectedAt > local.lastRejectedAt ? remote.lastRejectedKey : local.lastRejectedKey,
    lastRejectedAt: Math.max(local.lastRejectedAt, remote.lastRejectedAt),
    acceptedCounts: mergeNumericRecords(local.acceptedCounts, remote.acceptedCounts),
    rejectedCounts: mergeNumericRecords(local.rejectedCounts, remote.rejectedCounts),
    cooldownUntil: Math.max(local.cooldownUntil, remote.cooldownUntil)
  }
}

export const persistAssistantDecisionMemory = (userId, memory) => {
  const normalized = normalizeAssistantDecisionMemory(memory)
  writeAssistantDecisionMemory(userId, normalized)
  return normalized
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

  return persistAssistantDecisionMemory(userId, nextMemory)
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

const buildExecutionSuccess = (message, fullMessage = message) => ({
  ok: true,
  status: 'success',
  message,
  fullMessage
})

const buildExecutionError = (message, fullMessage = message) => ({
  ok: false,
  status: 'error',
  message,
  fullMessage
})

const normalizeTaskUpdates = (updates = {}) => {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) return {}

  const normalized = {}
  if (updates.title) normalized.title = String(updates.title).trim()
  if (updates.subject) normalized.subject = String(updates.subject).trim().toLowerCase()
  if (updates.priority) normalized.priority = String(updates.priority).trim().toLowerCase()

  const dueDate = updates.due_date || updates.dueDate || updates.date || null
  if (dueDate) normalized.due_date = String(dueDate).trim()

  return normalized
}

const getActiveTaskPool = (tasks = []) =>
  tasks.filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))

const findTaskById = (tasks = [], taskId) =>
  tasks.find((task) => String(task?.id) === String(taskId || '')) || null

const findTaskBySubject = (tasks = [], subject = '') => {
  const target = sanitize(subject)
  if (!target) return null
  return (
    getActiveTaskPool(tasks).find((task) => sanitize(task?.subject).includes(target)) || null
  )
}

const getTomorrowDateKey = (base = Date.now(), days = 1) => {
  const target = new Date(toNowMs(base))
  target.setDate(target.getDate() + days)
  return target.toISOString().slice(0, 10)
}

const getWeakSubjectTask = ({ tasks = [], studySessions = [], profile = {}, now = Date.now() }) => {
  const weakSubjects = getWeakSubjects(profile, studySessions)
  if (!weakSubjects.size) return null

  return getActiveTaskPool(tasks)
    .filter((task) => weakSubjects.has(String(task?.subject || '').trim().toLowerCase()))
    .sort((a, b) => {
      const urgencyDelta = getDueDayOffset(a, now) - getDueDayOffset(b, now)
      if (urgencyDelta !== 0) return urgencyDelta
      return getTaskPriorityWeight(b?.priority) - getTaskPriorityWeight(a?.priority)
    })[0] || null
}

const getRecommendedExecutionTask = ({ tasks = [], studySessions = [], profile = {}, memory = {}, cognitiveLoad = {}, now = Date.now() }) =>
  getTaskSuggestion({
    tasks: getActiveTaskPool(tasks),
    profile,
    studySessions,
    memory,
    cognitiveLoad,
    now
  })?.task || getOverdueTask(tasks, now) || getActiveTaskPool(tasks)[0] || null

const dispatchStudyControl = (detail) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('assistant:study-control', { detail }))
}

const actionMap = {
  async start_focus(params, deps) {
    const tasks = Array.isArray(deps?.tasks) ? deps.tasks : []
    const task = findTaskById(tasks, params?.taskId || params?.task_id) || findTaskBySubject(tasks, params?.subject)
    const duration = Number(params?.duration || params?.durationMinutes || 30) || 30

    return executeIntent(
      {
        type: duration ? 'start_pomodoro' : 'start_focus',
        data: {
          query: task?.title || String(params?.subject || '').trim(),
          subject: task?.subject || String(params?.subject || '').trim(),
          duration
        }
      },
      deps
    )
  },

  async start_free_session(params, deps) {
    const duration = Number(params?.duration || 30) || 30
    deps.navigate?.('/study', {
      state: {
        action: 'start',
        mode: 'free',
        duration,
        taskId: null
      }
    })
    return buildExecutionSuccess('Free session', `Opening a ${duration} minute free session.`)
  },

  async pause_session(_, deps) {
    return executeIntent({ type: 'pause', data: {} }, deps)
  },

  async resume_session(_, deps) {
    return executeIntent({ type: 'resume', data: {} }, deps)
  },

  async stop_session(_, deps) {
    return executeIntent({ type: 'finish_session', data: {} }, deps)
  },

  async extend_session(params, deps) {
    const duration = Number(params?.duration || 10) || 10
    dispatchStudyControl({ action: 'extend', duration })
    deps.navigate?.('/study', { state: { action: 'extend', duration } })
    return buildExecutionSuccess('Session extended', `Adding ${duration} minutes to the current session.`)
  },

  async create_task(params, deps) {
    const created = await deps.addTask?.({
      title: String(params?.title || '').trim(),
      subject: String(params?.subject || 'math').trim() || 'math',
      due_date: params?.dueDate || params?.due_date || null
    })
    return buildExecutionSuccess('Task created', created?.title ? `Created "${created.title}".` : 'Created a new task.')
  },

  async delete_task(params, deps) {
    await deps.removeTask?.(params?.taskId || params?.task_id)
    return buildExecutionSuccess('Task deleted', 'Deleted the selected task.')
  },

  async complete_task(params, deps) {
    const taskId = params?.taskId || params?.task_id
    if (deps.toggleTask) {
      await deps.toggleTask(taskId, false)
    } else {
      await deps.updateTaskById?.(taskId, { completed: true, status: 'completed' })
    }
    return buildExecutionSuccess('Task completed', 'Marked the selected task as done.')
  },

  async edit_task(params, deps) {
    const taskId = params?.taskId || params?.task_id
    const updates = normalizeTaskUpdates(params?.updates)
    if (!taskId || !Object.keys(updates).length) {
      return buildExecutionError('Edit unavailable', 'No valid task update was provided.')
    }
    await deps.updateTaskById?.(taskId, updates)
    return buildExecutionSuccess('Task updated', 'Saved the task changes.')
  },

  async reschedule_task(params, deps) {
    const taskId = params?.taskId || params?.task_id
    const date = String(params?.date || '').trim()
    await deps.updateTaskById?.(taskId, { due_date: date })
    return buildExecutionSuccess('Task rescheduled', `Moved the task to ${date}.`)
  },

  async select_task(params, deps) {
    const taskId = params?.taskId || params?.task_id
    deps.navigate?.('/study', {
      state: {
        suggestedTaskId: taskId,
        taskId
      }
    })
    return buildExecutionSuccess('Task selected', 'Opening Study with the selected task.')
  },

  async open_dashboard(_, deps) {
    deps.navigate?.('/dashboard')
    return buildExecutionSuccess('Opening dashboard', 'Navigating to the dashboard.')
  },

  async open_tasks(_, deps) {
    deps.navigate?.('/tasks')
    return buildExecutionSuccess('Opening tasks', 'Navigating to tasks.')
  },

  async open_study(_, deps) {
    deps.navigate?.('/study')
    return buildExecutionSuccess('Opening study', 'Navigating to study.')
  },

  async open_analysis(_, deps) {
    deps.navigate?.('/analytics')
    return buildExecutionSuccess('Opening analysis', 'Navigating to analysis.')
  },

  async open_settings(_, deps) {
    deps.navigate?.('/ai-control-center')
    return buildExecutionSuccess('Opening settings', 'Navigating to settings.')
  },

  async start_recommended_task(_, deps) {
    const task = getRecommendedExecutionTask({
      tasks: deps?.tasks || [],
      studySessions: deps?.studySessions || [],
      profile: deps?.profile || deps?.user || {},
      memory: deps?.memory || {},
      cognitiveLoad: deps?.cognitiveLoad || {},
      now: Date.now()
    })

    if (!task) {
      return buildExecutionError('No task found', 'There is no recommended task available right now.')
    }

    return actionMap.start_focus(
      {
        taskId: task.id,
        subject: task.subject,
        duration: getTaskDurationMinutes(task, 45)
      },
      deps
    )
  },

  async focus_on_weak_subject(_, deps) {
    const task = getWeakSubjectTask({
      tasks: deps?.tasks || [],
      studySessions: deps?.studySessions || [],
      profile: deps?.profile || deps?.user || {},
      now: Date.now()
    })

    if (!task) {
      return buildExecutionError('No weak-subject task', 'There is no weak-subject task ready right now.')
    }

    return actionMap.start_focus(
      {
        taskId: task.id,
        subject: task.subject,
        duration: getTaskDurationMinutes(task, 45)
      },
      deps
    )
  },

  async clear_overdue_tasks(_, deps) {
    const overdueTasks = (deps?.tasks || []).filter((task) => isOverdueTask(task))
    if (!overdueTasks.length) {
      return buildExecutionSuccess('No overdue tasks', 'There are no overdue tasks to clear.')
    }
    await Promise.all(overdueTasks.map((task) => deps.removeTask?.(task.id)))
    return buildExecutionSuccess('Overdue cleared', `Deleted ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}.`)
  },

  async reschedule_all_overdue(params, deps) {
    const overdueTasks = (deps?.tasks || []).filter((task) => isOverdueTask(task))
    if (!overdueTasks.length) {
      return buildExecutionSuccess('No overdue tasks', 'There are no overdue tasks to reschedule.')
    }
    const nextDate = String(params?.date || getTomorrowDateKey()).trim()
    await Promise.all(overdueTasks.map((task) => deps.updateTaskById?.(task.id, { due_date: nextDate })))
    return buildExecutionSuccess('Overdue rescheduled', `Moved ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} to ${nextDate}.`)
  },

  async navigate(params, deps) {
    deps.navigate?.(params?.path || params?.page || '/dashboard', params?.state ? { state: params.state } : undefined)
    return buildExecutionSuccess('Opening', 'Opening the requested page.')
  },

  async focus_task(params, deps) {
    return actionMap.start_focus(
      {
        taskId: params?.taskId,
        subject: params?.subject,
        duration: params?.durationMinutes
      },
      deps
    )
  },

  async break(params) {
    return buildExecutionSuccess('Break suggested', `Take ${params?.durationMinutes || 5} minutes to reset before the next session.`)
  },

  async idle() {
    return buildExecutionSuccess('Ready', 'No immediate action is needed right now.')
  },

  async do_nothing() {
    return buildExecutionSuccess('No action', 'No action taken.')
  }
}

export const executeAssistantDecision = async (decision, deps = {}) => {
  if (!decision?.action) return { ok: false, status: 'error', message: 'No action' }

  if (decision.action.kind === 'voice_intent') {
    return executeIntent(decision.action.intent, deps)
  }

  const kind = String(decision.action.kind || '').trim()
  const handler = actionMap[kind]

  if (!handler) {
    return { ok: false, status: 'error', message: 'Action unavailable' }
  }

  const params = {
    ...decision.action,
    ...(decision.task?.id ? { taskId: decision.action.taskId || decision.task.id } : {})
  }

  return handler(params, deps, decision)
}

export const canExecuteAssistantDecision = (decision) => {
  const kind = decision?.action?.kind
  if (!kind) return false

  switch (kind) {
    case 'voice_intent':
      return Boolean(decision?.action?.intent)
    case 'start_focus':
      return Boolean(decision?.action?.taskId || decision?.action?.subject)
    case 'start_free_session':
    case 'pause_session':
    case 'resume_session':
    case 'stop_session':
    case 'extend_session':
    case 'open_dashboard':
    case 'open_tasks':
    case 'open_study':
    case 'open_analysis':
    case 'open_settings':
    case 'start_recommended_task':
    case 'focus_on_weak_subject':
    case 'clear_overdue_tasks':
    case 'reschedule_all_overdue':
    case 'focus_task':
    case 'break':
    case 'navigate':
    case 'idle':
    case 'do_nothing':
      return true
    case 'create_task':
      return Boolean(String(decision?.action?.title || '').trim())
    case 'complete_task':
    case 'delete_task':
    case 'select_task':
      return Boolean(decision?.action?.taskId)
    case 'edit_task':
      return Boolean(decision?.action?.taskId && Object.keys(normalizeTaskUpdates(decision?.action?.updates)).length)
    case 'reschedule_task':
      return Boolean(decision?.action?.taskId && decision?.action?.date)
    default:
      return false
  }
}

export const getAssistantIgnoreThreshold = () => IGNORE_THRESHOLD_MS
