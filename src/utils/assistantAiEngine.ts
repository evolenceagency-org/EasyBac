const CACHE_PREFIX = 'assistant-openrouter-cache'
const CACHE_TTL_MS = 2 * 60 * 1000
const REQUEST_THROTTLE_MS = 45 * 1000
const MAX_CONTEXT_TASKS = 8

const VALID_ACTIONS = new Set(['focus_task', 'take_break', 'navigate_tasks', 'navigate_dashboard'])
const requestCache = new Map()

const DAY_MS = 24 * 60 * 60 * 1000

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

const toSubjectLabel = (value = 'focus') =>
  String(value || 'focus')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const getDueDayOffset = (task, now = Date.now()) => {
  if (!task?.due_date) return Number.POSITIVE_INFINITY
  const todayKey = toDayKey(now)
  const todayMs = new Date(`${todayKey}T00:00:00`).getTime()
  const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
  if (Number.isNaN(dueMs)) return Number.POSITIVE_INFINITY
  return Math.round((dueMs - todayMs) / DAY_MS)
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
    if (Number.isFinite(numeric) && numeric > 0) return Math.round(numeric)
  }

  return fallback
}

const getTodayStudyMinutes = (studySessions = [], now = Date.now()) => {
  const todayKey = toDayKey(now)
  return studySessions.reduce((total, session) => {
    const dateValue =
      session?.completed_at ||
      session?.ended_at ||
      session?.created_at ||
      session?.updated_at ||
      session?.date ||
      session?.started_at

    if (!dateValue || toDayKey(dateValue) !== todayKey) return total
    return total + (Number(session?.duration_minutes ?? session?.durationMinutes ?? session?.duration ?? 0) || 0)
  }, 0)
}

const getWeakSubjects = (profile = {}, studySessions = []) => {
  const explicit = Array.isArray(profile?.weakSubjects)
    ? profile.weakSubjects.map((item) => String(item).trim().toLowerCase())
    : []

  const minutesBySubject = studySessions.reduce((acc, session) => {
    const key = String(session?.subject || '').trim().toLowerCase()
    if (!key) return acc
    acc[key] = (acc[key] || 0) + (Number(session?.duration_minutes || 0) || 0)
    return acc
  }, {})

  const subjects = Object.keys(minutesBySubject)
  if (!subjects.length) return explicit

  const avg = subjects.reduce((sum, subject) => sum + minutesBySubject[subject], 0) / Math.max(subjects.length, 1)
  const inferred = subjects.filter((subject) => minutesBySubject[subject] <= avg * 0.7)
  return [...new Set([...explicit, ...inferred])]
}

const getExamDaysLeft = (profile = {}, now = Date.now()) => {
  const rawValue =
    profile?.exam_date ||
    profile?.examDate ||
    profile?.targetExamDate ||
    profile?.exam?.date ||
    null

  if (!rawValue) return null
  const examMs = new Date(rawValue).getTime()
  if (Number.isNaN(examMs)) return null
  return Math.max(0, Math.floor((examMs - toNowMs(now)) / DAY_MS))
}

const getMostRecentCompletedSession = (studySessions = [], now = Date.now()) =>
  [...studySessions]
    .map((session) => {
      const endedAt = session?.completed_at || session?.ended_at || session?.updated_at || session?.created_at || null
      const endedMs = endedAt ? new Date(endedAt).getTime() : Number.NaN
      return { session, endedMs }
    })
    .filter((entry) => Number.isFinite(entry.endedMs) && entry.endedMs <= toNowMs(now))
    .sort((a, b) => b.endedMs - a.endedMs)[0] || null

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const getStorageKey = (userId) => `${CACHE_PREFIX}:${userId || 'anonymous'}`

const readCache = (userId) => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(getStorageKey(userId))
  if (!raw) return null
  return safeJsonParse(raw)
}

const writeCache = (userId, value) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(value))
}

export const buildAssistantAiContext = ({
  tasks = [],
  studySessions = [],
  profile = {},
  timerState = null,
  cognitiveLoad = {},
  memory = {},
  currentPage = '',
  userId,
  fallbackDecision = null,
  now = Date.now()
}) => {
  const nowMs = toNowMs(now)
  const bucketMs = Math.floor(nowMs / (5 * 60 * 1000)) * (5 * 60 * 1000)
  const currentPageKey = String(currentPage || '').replace(/^\//, '') || 'dashboard'
  const activeTasks = tasks
    .filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))
    .sort((a, b) => {
      const dueDelta = getDueDayOffset(a, now) - getDueDayOffset(b, now)
      if (dueDelta !== 0) return dueDelta
      return String(a?.title || '').localeCompare(String(b?.title || ''))
    })

  const overdueTasks = activeTasks.filter((task) => getDueDayOffset(task, now) < 0)
  const todayStudyMinutes = getTodayStudyMinutes(studySessions, now)
  const recentSession = getMostRecentCompletedSession(studySessions, now)
  const recentSessionMinutes = Number(
    recentSession?.session?.duration_minutes ??
      recentSession?.session?.durationMinutes ??
      recentSession?.session?.duration ??
      0
  ) || 0

  const tasksForContext = activeTasks.slice(0, MAX_CONTEXT_TASKS).map((task) => ({
    id: String(task.id),
    title: String(task.title || '').trim() || 'Untitled',
    subject: toSubjectLabel(task.subject),
    priority: String(task.priority || 'medium').toLowerCase(),
    due_in_days: getDueDayOffset(task, now),
    overdue: getDueDayOffset(task, now) < 0,
    duration_minutes: getTaskDurationMinutes(task, 45),
    sessions_count: Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 0,
    last_rejected_at: memory?.tasks?.[task.id]?.lastRejectedAt || 0,
    last_accepted_at: memory?.tasks?.[task.id]?.lastAcceptedAt || 0
  }))

  const payload = {
    user_id: userId || null,
    now_iso: new Date(bucketMs).toISOString(),
    current_page: currentPageKey,
    exam_days_left: getExamDaysLeft(profile, now),
    weak_subjects: getWeakSubjects(profile, studySessions),
    today_study_minutes: todayStudyMinutes,
    session_state: {
      active: Boolean(timerState?.isRunning),
      mode: timerState?.mode || null,
      phase: timerState?.phase || null,
      formatted: timerState?.formatted || null,
      seconds: Number(timerState?.seconds || 0) || 0
    },
    recent_session_minutes: recentSessionMinutes,
    recent_session_age_minutes: recentSession ? Math.floor((toNowMs(now) - recentSession.endedMs) / (60 * 1000)) : null,
    cognitive_state: String(cognitiveLoad?.state || 'normal').toLowerCase(),
    active_task_count: activeTasks.length,
    overdue_count: overdueTasks.length,
    overdue_tasks: overdueTasks.slice(0, 4).map((task) => ({
      id: String(task.id),
      title: String(task.title || '').trim() || 'Untitled',
      subject: toSubjectLabel(task.subject),
      due_in_days: getDueDayOffset(task, now),
      duration_minutes: getTaskDurationMinutes(task, 45)
    })),
    tasks: tasksForContext,
    last_action: memory?.lastAction || null,
    fallback_recommendation: fallbackDecision
      ? {
          key: fallbackDecision.key,
          title: fallbackDecision.title,
          type: fallbackDecision.type,
          task_id: fallbackDecision.task?.id || null
        }
      : null
  }

  const signature = JSON.stringify(payload)
  const shouldRequest =
    currentPageKey !== 'study' &&
    !timerState?.isRunning &&
    activeTasks.length > 0

  return {
    userId,
    payload,
    signature,
    shouldRequest
  }
}

export const validateAssistantAiRecommendation = (recommendation, context) => {
  if (!recommendation || typeof recommendation !== 'object') return null

  const action = String(recommendation.action || '').trim()
  if (!VALID_ACTIONS.has(action)) return null

  const durationValue = recommendation.duration == null ? null : Number(recommendation.duration)
  const duration =
    durationValue == null || Number.isNaN(durationValue)
      ? null
      : clamp(Math.round(durationValue), 5, 120)

  const text = String(recommendation.text || '').trim()
  if (!text) return null

  const taskId = recommendation.task_id == null ? null : String(recommendation.task_id)
  const matchingTask = taskId
    ? (context?.payload?.tasks || []).find((task) => String(task.id) === taskId) || null
    : null

  if (action === 'focus_task' && !matchingTask) return null
  if (action !== 'focus_task' && taskId && !matchingTask) return null

  return {
    action,
    task_id: matchingTask?.id || null,
    duration,
    text
  }
}

export const fetchAssistantAiRecommendation = async ({ context, signal, force = false }) => {
  if (!context?.shouldRequest) {
    return { ok: false, reason: 'not_eligible' }
  }

  const cached = readCache(context.userId)
  const now = Date.now()
  if (
    !force &&
    cached?.signature === context.signature &&
    now - Number(cached?.savedAt || 0) < CACHE_TTL_MS
  ) {
    return {
      ok: true,
      recommendation: cached.recommendation,
      source: 'cache'
    }
  }

  if (
    !force &&
    cached?.savedAt &&
    now - Number(cached.savedAt) < REQUEST_THROTTLE_MS &&
    cached?.recommendation
  ) {
    return {
      ok: true,
      recommendation: cached.recommendation,
      source: 'throttled-cache'
    }
  }

  const pendingKey = `${context.userId || 'anonymous'}:${context.signature}`
  if (!force && requestCache.has(pendingKey)) {
    return requestCache.get(pendingKey)
  }

  const requestPromise = fetch('/api/assistant-recommendation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      context: context.payload
    }),
    signal
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Assistant AI request failed')
      }

      const data = await response.json()
      const recommendation = validateAssistantAiRecommendation(data?.recommendation, context)
      if (!recommendation) {
        return { ok: false, reason: 'invalid_ai_payload' }
      }

      writeCache(context.userId, {
        signature: context.signature,
        savedAt: Date.now(),
        recommendation
      })

      return {
        ok: true,
        recommendation,
        source: 'network'
      }
    })
    .catch((error) => {
      if (error?.name === 'AbortError') {
        return { ok: false, reason: 'aborted' }
      }
      return {
        ok: false,
        reason: 'request_failed',
        error
      }
    })
    .finally(() => {
      requestCache.delete(pendingKey)
    })

  if (!force) {
    requestCache.set(pendingKey, requestPromise)
  }

  return requestPromise
}

export const buildAssistantDecisionFromAi = ({ recommendation, context, tasks = [] }) => {
  const validated = validateAssistantAiRecommendation(recommendation, context)
  if (!validated) return null

  const task = validated.task_id
    ? tasks.find((item) => String(item?.id) === String(validated.task_id)) || null
    : null

  if (validated.action === 'focus_task' && !task) return null

  if (validated.action === 'focus_task') {
    return {
      key: `ai:task:${task.id}:${validated.duration || getTaskDurationMinutes(task, 45)}`,
      state: 'suggesting',
      origin: 'ai',
      type: 'task',
      task,
      status: 'AI',
      tone: getDueDayOffset(task, Date.now()) < 0 ? 'warning' : 'suggestion',
      title: validated.text,
      shortMessage: validated.text,
      detail: 'AI-picked from your tasks, deadlines, weak subjects, and recent study activity.',
      action: {
        kind: 'focus_task',
        taskId: task.id,
        durationMinutes: validated.duration || getTaskDurationMinutes(task, 45),
        path: '/study',
        state: {
          suggestedTaskId: task.id,
          taskId: task.id,
          action: 'start',
          duration: validated.duration || getTaskDurationMinutes(task, 45)
        }
      }
    }
  }

  if (validated.action === 'take_break') {
    return {
      key: `ai:break:${validated.duration || 5}`,
      state: 'suggesting',
      origin: 'ai',
      type: 'break',
      status: 'AI',
      tone: 'neutral',
      title: validated.text,
      shortMessage: validated.text,
      detail: 'AI suggests a short reset before the next study block.',
      action: {
        kind: 'break',
        durationMinutes: validated.duration || 5
      }
    }
  }

  const path = validated.action === 'navigate_tasks' ? '/tasks' : '/dashboard'
  return {
    key: `ai:navigate:${validated.action}`,
    state: 'suggesting',
    origin: 'ai',
    type: 'navigation',
    status: 'AI',
    tone: 'neutral',
    title: validated.text,
    shortMessage: validated.text,
    detail: 'AI recommends the next best page for your current state.',
    action: {
      kind: 'navigate',
      path
    }
  }
}
