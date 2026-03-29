const CACHE_PREFIX = 'assistant-openrouter-cache'
const CACHE_TTL_MS = 45 * 1000
const REQUEST_THROTTLE_MS = 45 * 1000
const MAX_CONTEXT_TASKS = 6
const VALID_ACTIONS = new Set(['start_focus', 'break', 'continue', 'reschedule', 'idle'])

const pendingRequests = new Map()

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

const toSubjectLabel = (value = 'focus') =>
  String(value || 'focus')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const toPriorityScore = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'high') return 3
  if (normalized === 'medium') return 2
  if (normalized === 'low') return 1

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return clamp(Math.round(numeric), 1, 3)
  }

  return 2
}

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
    if (Number.isFinite(numeric) && numeric > 0) {
      return clamp(Math.round(numeric), 10, 90)
    }
  }

  return fallback
}

const getTodayStudyStats = (studySessions = [], now = Date.now()) => {
  const todayKey = toDayKey(now)

  return studySessions.reduce(
    (acc, session) => {
      const dateValue =
        session?.completed_at ||
        session?.ended_at ||
        session?.created_at ||
        session?.updated_at ||
        session?.date ||
        session?.started_at

      if (!dateValue || toDayKey(dateValue) !== todayKey) return acc

      acc.studyMin += Number(session?.duration_minutes ?? session?.durationMinutes ?? session?.duration ?? 0) || 0
      acc.sessions += 1
      return acc
    },
    { studyMin: 0, sessions: 0 }
  )
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

  const average = subjects.reduce((sum, subject) => sum + minutesBySubject[subject], 0) / Math.max(subjects.length, 1)
  const inferred = subjects.filter((subject) => minutesBySubject[subject] <= average * 0.7)

  return [...new Set([...explicit, ...inferred])].slice(0, 4)
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

const getMemoryContext = (memory = {}) => ({
  accepted: {
    start_focus: Number(memory?.acceptedCounts?.start_focus || 0) || 0,
    break: Number(memory?.acceptedCounts?.break || 0) || 0,
    reschedule: Number(memory?.acceptedCounts?.reschedule || 0) || 0
  },
  rejected: {
    start_focus: Number(memory?.rejectedCounts?.start_focus || 0) || 0,
    break: Number(memory?.rejectedCounts?.break || 0) || 0,
    reschedule: Number(memory?.rejectedCounts?.reschedule || 0) || 0
  },
  last_action: memory?.lastAction?.type || null,
  last_task_id: memory?.lastAcceptedTaskId || memory?.lastTaskId || null
})

const getSessionElapsedMinutes = (timerState = null) => {
  if (!timerState?.isRunning) return 0

  if (timerState?.mode === 'pomodoro') {
    const defaultMinutes = timerState?.phase === 'break' ? 15 : 45
    const targetSeconds = Number(timerState?.targetSeconds || defaultMinutes * 60)
    const remainingSeconds = Number(timerState?.seconds || 0)
    return Math.max(0, Math.round((targetSeconds - remainingSeconds) / 60))
  }

  return Math.max(0, Math.round((Number(timerState?.seconds || 0) || 0) / 60))
}

const getRecentSessionMinutes = (studySessions = [], now = Date.now()) => {
  const recent = [...studySessions]
    .map((session) => {
      const endedAt = session?.completed_at || session?.ended_at || session?.updated_at || session?.created_at || null
      const endedMs = endedAt ? new Date(endedAt).getTime() : Number.NaN
      return { session, endedMs }
    })
    .filter((entry) => Number.isFinite(entry.endedMs) && entry.endedMs <= toNowMs(now))
    .sort((a, b) => b.endedMs - a.endedMs)[0]

  if (!recent) return 0
  if (toNowMs(now) - recent.endedMs > 25 * 60 * 1000) return 0

  return Number(
    recent.session?.duration_minutes ??
      recent.session?.durationMinutes ??
      recent.session?.duration ??
      0
  ) || 0
}

export const buildAssistantAiContext = ({
  tasks = [],
  studySessions = [],
  profile = {},
  timerState = null,
  memory = {},
  currentPage = '',
  userId,
  now = Date.now()
}) => {
  const currentPageKey = String(currentPage || '').replace(/^\//, '') || 'dashboard'
  const activeElapsedMinutes = getSessionElapsedMinutes(timerState)
  const recentSessionMinutes = getRecentSessionMinutes(studySessions, now)
  const activeTasks = tasks
    .filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))
    .sort((a, b) => {
      const overdueDelta = Number(getDueDayOffset(a, now) < 0) - Number(getDueDayOffset(b, now) < 0)
      if (overdueDelta !== 0) return overdueDelta
      return getDueDayOffset(a, now) - getDueDayOffset(b, now)
    })

  const trimmedTasks = activeTasks.slice(0, MAX_CONTEXT_TASKS).map((task) => ({
    id: String(task.id),
    subject: toSubjectLabel(task.subject),
    priority: toPriorityScore(task.priority),
    due_in_days: getDueDayOffset(task, now),
    overdue: getDueDayOffset(task, now) < 0
  }))

  const payload = {
    now: new Date(Math.floor(toNowMs(now) / (5 * 60 * 1000)) * (5 * 60 * 1000)).toISOString(),
    exam_days_left: getExamDaysLeft(profile, now),
    session: {
      active: Boolean(timerState?.isRunning),
      elapsed_min: activeElapsedMinutes || recentSessionMinutes
    },
    today: getTodayStudyStats(studySessions, now),
    tasks: trimmedTasks,
    weak_subjects: getWeakSubjects(profile, studySessions),
    memory: getMemoryContext(memory)
  }

  return {
    userId,
    currentPage: currentPageKey,
    payload,
    signature: JSON.stringify(payload),
    shouldRequest: currentPageKey !== 'study'
  }
}

export const validateAssistantAiOutput = (output, context) => {
  if (!output || typeof output !== 'object') return null

  const action = String(output.action || '').trim()
  if (!VALID_ACTIONS.has(action)) return null

  const taskId = output.task_id == null ? null : String(output.task_id)
  const durationValue = output.duration_min == null ? null : Number(output.duration_min)
  const durationMin =
    durationValue == null || Number.isNaN(durationValue)
      ? null
      : clamp(Math.round(durationValue), 1, 90)

  const text = String(output.text || '').trim()
  if (!text) return null

  const confidenceValue = Number(output.confidence)
  const confidence = Number.isFinite(confidenceValue) ? clamp(confidenceValue, 0, 1) : 0

  const tasks = Array.isArray(context?.payload?.tasks) ? context.payload.tasks : []
  const matchingTask = taskId ? tasks.find((task) => String(task.id) === taskId) || null : null

  if (action === 'start_focus' && !matchingTask) return null
  if (action === 'break' && (durationMin == null || durationMin > 10)) return null
  if (action === 'break' && Number(context?.payload?.session?.elapsed_min || 0) < 20) return null
  if (action === 'start_focus' && tasks.length === 0) return null

  return {
    action,
    task_id: matchingTask?.id || null,
    duration_min: durationMin,
    text,
    confidence
  }
}

const fetchAssistantAi = async ({ endpoint, body, context, signal, force = false }) => {
  if (!force) {
    const cached = readCache(context.userId)
    const now = Date.now()

    if (
      cached?.endpoint === endpoint &&
      cached?.signature === context.signature &&
      now - Number(cached?.savedAt || 0) < CACHE_TTL_MS
    ) {
      return { ok: true, output: cached.output, source: 'cache' }
    }

    if (
      cached?.savedAt &&
      now - Number(cached.savedAt) < REQUEST_THROTTLE_MS &&
      cached?.output
    ) {
      return { ok: true, output: cached.output, source: 'throttled-cache' }
    }
  }

  const requestKey = `${endpoint}:${context.userId || 'anonymous'}:${context.signature}`
  if (!force && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey)
  }

  const requestPromise = fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    signal
  })
    .then(async (response) => {
      if (!response.ok) {
        const detail = await response.text()
        throw new Error(detail || 'Assistant AI request failed')
      }

      const data = await response.json()
      if (!data?.output || typeof data.output !== 'object') {
        return { ok: false, reason: 'invalid_response' }
      }

      writeCache(context.userId, {
        endpoint,
        signature: context.signature,
        savedAt: Date.now(),
        output: data.output
      })

      return { ok: true, output: data.output, source: 'network' }
    })
    .catch((error) => {
      if (error?.name === 'AbortError') return { ok: false, reason: 'aborted' }
      return { ok: false, reason: 'request_failed', error }
    })
    .finally(() => {
      pendingRequests.delete(requestKey)
    })

  if (!force) {
    pendingRequests.set(requestKey, requestPromise)
  }

  return requestPromise
}

export const fetchAssistantAiRecommendation = async ({ context, signal, force = false }) => {
  if (!context?.shouldRequest) {
    return { ok: false, reason: 'not_eligible' }
  }

  const result = await fetchAssistantAi({
    endpoint: '/api/assistant-recommendation',
    body: {
      mode: 'recommendation',
      context: context.payload
    },
    context,
    signal,
    force
  })

  if (!result.ok) return result

  const output = validateAssistantAiOutput(result.output, context)
  if (!output) return { ok: false, reason: 'invalid_output' }

  return { ok: true, output, source: result.source }
}

export const fetchAssistantVoiceDecision = async ({ transcript, context, signal }) => {
  const result = await fetchAssistantAi({
    endpoint: '/api/assistant-recommendation',
    body: {
      mode: 'voice',
      transcript,
      context: context.payload
    },
    context,
    signal,
    force: true
  })

  if (!result.ok) return result

  const output = validateAssistantAiOutput(result.output, context)
  if (!output) return { ok: false, reason: 'invalid_output' }

  return { ok: true, output, source: result.source }
}

const buildTitleFromOutput = (output, task) => {
  if (output?.text) return output.text

  if (output?.action === 'start_focus' && task) {
    return `Start ${toSubjectLabel(task.subject)} • ${output.duration_min || getTaskDurationMinutes(task, 45)}min`
  }

  if (output?.action === 'break') {
    return `Break • ${output.duration_min || 5}min`
  }

  if (output?.action === 'continue' && task) {
    return `Continue ${toSubjectLabel(task.subject)} • ${output.duration_min || getTaskDurationMinutes(task, 20)}min`
  }

  if (output?.action === 'reschedule') {
    return 'Reschedule task • Review • 2min'
  }

  return 'Stay ready • Review • 2min'
}

export const buildAssistantDecisionFromAi = ({
  output,
  context,
  tasks = [],
  origin = 'ai',
  confirm = false
}) => {
  const validated = validateAssistantAiOutput(output, context)
  if (!validated) return null

  const task = validated.task_id
    ? tasks.find((item) => String(item?.id) === String(validated.task_id)) || null
    : null

  const title = buildTitleFromOutput(validated, task)
  const detail = confirm
    ? 'Swipe right to confirm or left to cancel.'
    : origin === 'voice'
      ? 'Swipe right to run or left to cancel.'
      : 'AI-selected next step.'

  if (validated.action === 'start_focus') {
    const duration = validated.duration_min || getTaskDurationMinutes(task, 45)
    return {
      key: `${origin}:start_focus:${task?.id || 'task'}:${duration}`,
      state: 'suggesting',
      origin,
      type: 'task',
      aiAction: 'start_focus',
      task,
      status: origin === 'voice' ? 'VOICE' : 'AI',
      tone: task && getDueDayOffset(task, Date.now()) < 0 ? 'warning' : 'suggestion',
      title,
      shortMessage: title,
      confidence: validated.confidence,
      detail,
      action: {
        kind: 'focus_task',
        taskId: task?.id || null,
        durationMinutes: duration,
        path: '/study',
        state: {
          suggestedTaskId: task?.id || null,
          taskId: task?.id || null,
          action: 'start',
          duration
        }
      }
    }
  }

  if (validated.action === 'break') {
    return {
      key: `${origin}:break:${validated.duration_min || 5}`,
      state: 'suggesting',
      origin,
      type: 'break',
      aiAction: 'break',
      status: origin === 'voice' ? 'VOICE' : 'AI',
      tone: 'neutral',
      title,
      shortMessage: title,
      confidence: validated.confidence,
      detail,
      action: {
        kind: 'break',
        durationMinutes: validated.duration_min || 5
      }
    }
  }

  if (validated.action === 'continue') {
    return {
      key: `${origin}:continue:${task?.id || 'session'}`,
      state: 'suggesting',
      origin,
      type: task ? 'task' : 'continue',
      aiAction: 'continue',
      task,
      status: origin === 'voice' ? 'VOICE' : 'AI',
      tone: 'active',
      title,
      shortMessage: title,
      confidence: validated.confidence,
      detail,
      action: {
        kind: 'navigate',
        path: '/study',
        state: task?.id
          ? {
              suggestedTaskId: task.id,
              taskId: task.id,
              action: 'resume'
            }
          : { action: 'resume' }
      }
    }
  }

  if (validated.action === 'reschedule') {
    return {
      key: `${origin}:reschedule:${task?.id || 'task'}`,
      state: 'suggesting',
      origin,
      type: 'navigation',
      aiAction: 'reschedule',
      task,
      status: origin === 'voice' ? 'VOICE' : 'AI',
      tone: 'warning',
      title,
      shortMessage: title,
      confidence: validated.confidence,
      detail,
      action: {
        kind: 'navigate',
        path: '/tasks'
      }
    }
  }

  return {
    key: `${origin}:idle`,
    state: 'suggesting',
    origin,
    type: 'idle',
    aiAction: 'idle',
    status: origin === 'voice' ? 'VOICE' : 'AI',
    tone: 'neutral',
    title,
    shortMessage: title,
    confidence: validated.confidence,
    detail,
    action: {
      kind: 'idle'
    }
  }
}
