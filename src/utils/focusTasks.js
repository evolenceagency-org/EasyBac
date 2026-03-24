import {
  buildMemoryGraphSnapshot,
  getTaskMemoryProfile,
  inferConceptPathFromTask
} from './memoryGraph.ts'

const ACTIVE_TASK_PREFIX = 'active-focus-task'
const TASK_META_PREFIX = 'task-focus-meta'
const SESSION_LINK_PREFIX = 'task-session-links'

const isBrowser = typeof window !== 'undefined'

const readJson = (key, fallback) => {
  if (!isBrowser) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures to avoid blocking app flow.
  }
}

const removeItem = (key) => {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

const getActiveTaskKey = (userId) => `${ACTIVE_TASK_PREFIX}:${userId || 'guest'}`
const getTaskMetaKey = (userId) => `${TASK_META_PREFIX}:${userId || 'guest'}`
const getSessionLinksKey = (userId) => `${SESSION_LINK_PREFIX}:${userId || 'guest'}`

const normalizeMinutes = (value) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return 0
  return Math.round(num)
}

export const getActiveFocusTaskId = (userId) => {
  if (!isBrowser) return null
  return window.localStorage.getItem(getActiveTaskKey(userId))
}

export const setActiveFocusTaskId = (userId, taskId) => {
  if (!isBrowser || !userId) return
  if (!taskId) {
    removeItem(getActiveTaskKey(userId))
    return
  }
  window.localStorage.setItem(getActiveTaskKey(userId), String(taskId))
}

export const clearActiveFocusTaskId = (userId) => {
  if (!userId) return
  removeItem(getActiveTaskKey(userId))
}

export const getTaskFocusMetaMap = (userId) => {
  return readJson(getTaskMetaKey(userId), {})
}

export const getSessionTaskLinks = (userId) => {
  return readJson(getSessionLinksKey(userId), {})
}

export const mergeTasksWithFocusMeta = (userId, tasks = [], profile = null) => {
  const metaMap = getTaskFocusMetaMap(userId)
  const memoryGraph = buildMemoryGraphSnapshot({ personalization: profile || {}, tasks })

  return tasks.map((task) => {
    const meta = metaMap[task.id] || {}
    const totalFocusTime = normalizeMinutes(
      task.total_focus_time ?? task.totalFocusTime ?? meta.totalFocusTime ?? 0
    )
    const sessionsCount = normalizeMinutes(
      task.sessions_count ?? task.sessionsCount ?? meta.sessionsCount ?? 0
    )
    const lastSessionAt = task.last_session_at ?? task.lastSessionAt ?? meta.lastSessionAt ?? null
    const concept = getTaskMemoryProfile(task, profile || {}, memoryGraph)

    return {
      ...task,
      totalFocusTime,
      sessionsCount,
      lastSessionAt,
      topic: task.topic || concept.topic,
      subtopic: task.subtopic || concept.subtopic,
      conceptLabel: concept.label,
      conceptMastery: concept.mastery,
      conceptConfidence: concept.confidence,
      conceptPath: concept
    }
  })
}

export const mergeStudySessionsWithTaskLinks = (userId, sessions = []) => {
  const links = getSessionTaskLinks(userId)

  return sessions.map((session) => {
    const link = links[session.id] || {}
    return {
      ...session,
      taskId: session.task_id ?? session.taskId ?? link.taskId ?? null,
      startedAt: session.started_at ?? session.startedAt ?? link.startedAt ?? null,
      endedAt: session.ended_at ?? session.endedAt ?? link.endedAt ?? null
    }
  })
}

export const trackTaskFocusSession = (
  userId,
  { sessionId, taskId, durationMinutes, startedAt = null, endedAt = null }
) => {
  if (!userId || !taskId) return null

  const safeDuration = normalizeMinutes(durationMinutes)
  const taskMetaMap = getTaskFocusMetaMap(userId)
  const currentMeta = taskMetaMap[taskId] || {
    totalFocusTime: 0,
    sessionsCount: 0,
    lastSessionAt: null
  }

  taskMetaMap[taskId] = {
    totalFocusTime: normalizeMinutes(currentMeta.totalFocusTime) + safeDuration,
    sessionsCount: normalizeMinutes(currentMeta.sessionsCount) + 1,
    lastSessionAt: endedAt || new Date().toISOString()
  }
  writeJson(getTaskMetaKey(userId), taskMetaMap)

  if (sessionId) {
    const sessionLinks = getSessionTaskLinks(userId)
    sessionLinks[sessionId] = {
      taskId,
      startedAt,
      endedAt
    }
    writeJson(getSessionLinksKey(userId), sessionLinks)
  }

  return taskMetaMap[taskId]
}

export const getSuggestedFocusTask = (tasks = [], profile = null) => {
  const pendingTasks = tasks.filter(
    (task) => !task.completed && task.status !== 'completed' && task.status !== 'on_hold'
  )
  if (pendingTasks.length === 0) return null

  const weakSubjects = (profile?.weakSubjects || profile?.personalization?.weakSubjects || []).map((item) =>
    String(item).trim().toLowerCase()
  )
  const todayKey = new Date().toISOString().slice(0, 10)
  const memoryGraph = buildMemoryGraphSnapshot({ personalization: profile || {}, tasks: pendingTasks })

  const rankedTasks = [...pendingTasks].sort((a, b) => {
    const getScore = (task) => {
      let score = 0
      const subject = String(task.subject || '').trim().toLowerCase()
      const focusMinutes = normalizeMinutes(task.total_focus_time ?? task.totalFocusTime ?? 0)
      const sessionsCount = normalizeMinutes(task.sessions_count ?? task.sessionsCount ?? 0)
      const concept = getTaskMemoryProfile(task, profile || {}, memoryGraph)

      if (task.due_date && task.due_date < todayKey) {
        score += 500
      } else if (task.due_date === todayKey) {
        score += 280
      } else if (task.due_date) {
        score += 160
      }

      if (weakSubjects.includes(subject)) score += 120
      if (concept.mastery <= 30) score += 140
      else if (concept.mastery <= 45) score += 90
      else if (concept.mastery <= 60) score += 40
      else if (concept.mastery >= 80) score -= 30
      if (focusMinutes === 0) score += 90
      else score += Math.max(0, 75 - focusMinutes)
      if (sessionsCount === 0) score += 24

      return score
    }

    const scoreDiff = getScore(b) - getScore(a)
    if (scoreDiff !== 0) return scoreDiff

    if (!a.due_date && !b.due_date) return 0
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return String(a.due_date).localeCompare(String(b.due_date))
  })

  return rankedTasks[0] || pendingTasks[0]
}

export const formatFocusSummary = (totalFocusTime = 0, sessionsCount = 0) => {
  const total = normalizeMinutes(totalFocusTime)
  if (total <= 0 && sessionsCount <= 0) return 'No focus sessions yet'

  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const timeLabel =
    hours > 0 ? `${hours}h ${minutes.toString().padStart(2, '0')}m` : `${minutes}m`
  const sessionsLabel = `${sessionsCount} session${sessionsCount === 1 ? '' : 's'}`
  return `${timeLabel} - ${sessionsLabel}`
}
