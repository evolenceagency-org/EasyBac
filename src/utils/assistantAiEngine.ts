const CACHE_PREFIX = 'assistant-openrouter-cache'
const CACHE_TTL_MS = 45 * 1000
const REQUEST_THROTTLE_MS = 45 * 1000
const MAX_CONTEXT_TASKS = 4
const MAX_CONTEXT_BYTES = 1024
const VALID_ACTIONS = new Set(['start_focus', 'break', 'continue', 'reschedule', 'idle'])
const VALID_VOICE_ACTIONS = new Set([
  'start_focus',
  'pause_session',
  'resume_session',
  'open_tasks',
  'open_study',
  'open_dashboard',
  'create_task',
  'delete_task',
  'complete_task',
  'reschedule_task',
  'select_task',
  'start_free_session',
  'finish_session',
  'navigate',
  'none'
])
const ASSISTANT_VOICE_FUNCTIONS = [
  'start_focus',
  'pause_session',
  'resume_session',
  'open_tasks',
  'open_study',
  'open_dashboard',
  'create_task',
  'delete_task',
  'complete_task',
  'reschedule_task',
  'select_task',
  'start_free_session',
  'finish_session',
  'navigate',
  'none'
]

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
  previous_actions: memory?.lastAction?.type
    ? [
        {
          type: memory.lastAction.type,
          outcome: memory?.lastAction?.outcome || null
        }
      ]
    : [],
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

const normalizeTaskTitle = (value = '') => String(value || '').trim()

const buildVoiceTaskList = (tasks = [], now = Date.now()) =>
  tasks
    .filter((task) => !(task?.completed || task?.status === 'completed' || task?.status === 'on_hold'))
    .slice(0, 8)
    .map((task) => ({
      id: String(task.id),
      title: normalizeTaskTitle(task.title),
      subject: toSubjectLabel(task.subject),
      priority: toPriorityScore(task.priority),
      due_in_days: getDueDayOffset(task, now),
      overdue: getDueDayOffset(task, now) < 0
    }))

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

const trimAssistantContextPayload = (payload) => {
  const base = {
    ...payload,
    weak_subjects: Array.isArray(payload?.weak_subjects) ? [...payload.weak_subjects] : [],
    tasks: Array.isArray(payload?.tasks) ? [...payload.tasks] : [],
    memory: {
      previous_actions: Array.isArray(payload?.memory?.previous_actions)
        ? [...payload.memory.previous_actions]
        : [],
      accepted: { ...(payload?.memory?.accepted || {}) },
      rejected: { ...(payload?.memory?.rejected || {}) },
      last_task_id: payload?.memory?.last_task_id || null
    }
  }

  const getSize = () => JSON.stringify(base).length

  while (base.tasks.length > 0 && getSize() > MAX_CONTEXT_BYTES) {
    base.tasks.pop()
  }

  while (base.weak_subjects.length > 0 && getSize() > MAX_CONTEXT_BYTES) {
    base.weak_subjects.pop()
  }

  if (getSize() > MAX_CONTEXT_BYTES) {
    base.memory.previous_actions = base.memory.previous_actions.slice(0, 1)
  }

  if (getSize() > MAX_CONTEXT_BYTES) {
    base.memory.accepted = {
      start_focus: base.memory.accepted.start_focus || 0
    }
    base.memory.rejected = {
      start_focus: base.memory.rejected.start_focus || 0
    }
  }

  if (getSize() > MAX_CONTEXT_BYTES) {
    delete base.memory.last_task_id
  }

  return base
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

  const compactPayload = trimAssistantContextPayload(payload)

  return {
    userId,
    currentPage: currentPageKey,
    payload: compactPayload,
    rawTasks: activeTasks,
    signature: JSON.stringify(compactPayload),
    shouldRequest: currentPageKey !== 'study'
  }
}

export const buildAssistantVoiceAiInput = ({
  transcript,
  context,
  tasks = []
}) => ({
  transcript: String(transcript || '').trim(),
  available_functions: [...ASSISTANT_VOICE_FUNCTIONS],
  tasks: buildVoiceTaskList(tasks, Date.now()),
  session: {
    active: Boolean(context?.payload?.session?.active),
    elapsed_min: Number(context?.payload?.session?.elapsed_min || 0) || 0
  },
  exam_days_left:
    Number.isFinite(Number(context?.payload?.exam_days_left))
      ? Number(context.payload.exam_days_left)
      : null
})

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

const sanitizeTaskLookup = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeAssistantPage = (value = '') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('/')) return normalized
  if (normalized === 'tasks') return '/tasks'
  if (normalized === 'study') return '/study'
  if (normalized === 'dashboard') return '/dashboard'
  if (normalized === 'analytics') return '/analytics'
  if (normalized === 'personalization') return '/personalization'
  return `/${normalized}`
}

const findVoiceTaskMatch = (tasks = [], params = {}) => {
  const taskId = params?.task_id == null ? null : String(params.task_id)
  if (taskId) {
    return tasks.find((task) => String(task.id) === taskId) || null
  }

  const title = sanitizeTaskLookup(params?.title || params?.query || '')
  const subject = sanitizeTaskLookup(params?.subject || '')
  if (!title && !subject) return null

  return (
    tasks.find((task) => {
      const taskTitle = sanitizeTaskLookup(task?.title)
      const taskSubject = sanitizeTaskLookup(task?.subject)
      if (title && taskTitle.includes(title)) return true
      if (subject && taskSubject.includes(subject)) return true
      return false
    }) || null
  )
}

export const validateAssistantVoiceOutput = (output, input) => {
  if (!output || typeof output !== 'object') return null

  const action = String(output.action || '').trim()
  if (!VALID_VOICE_ACTIONS.has(action)) return null

  const text = String(output.text || '').trim()
  if (!text || text.length > 80) return null

  const params = output.params && typeof output.params === 'object' && !Array.isArray(output.params) ? output.params : {}
  const needsConfirmation = output.needs_confirmation !== false
  const tasks = Array.isArray(input?.tasks) ? input.tasks : []
  const matchedTask = findVoiceTaskMatch(tasks, params)

  if (action === 'start_focus') {
    const duration = params?.duration == null ? params?.duration_min : params?.duration
    const durationValue = duration == null ? null : Number(duration)
    const subject = String(params?.subject || matchedTask?.subject || '').trim()
    if (!matchedTask && !subject) return null
    if (!Number.isFinite(durationValue) || durationValue <= 0 || durationValue > 180) return null
  }

  if (action === 'create_task' && !String(params?.title || '').trim()) return null

  if ((action === 'complete_task' || action === 'delete_task' || action === 'select_task') && !matchedTask) {
    return null
  }

  if (action === 'reschedule_task' && (!matchedTask || !String(params?.date || '').trim())) {
    return null
  }

  if (action === 'start_free_session') {
    const duration = params?.duration == null ? params?.duration_min : params?.duration
    const durationValue = duration == null ? 30 : Number(duration)
    if (!Number.isFinite(durationValue) || durationValue <= 0 || durationValue > 180) return null
  }

  if (action === 'pause_session' || action === 'resume_session' || action === 'open_tasks' || action === 'open_study' || action === 'open_dashboard' || action === 'finish_session' || action === 'none') {
    // No extra params required.
  }

  if (action === 'navigate') {
    const page = normalizeAssistantPage(params?.page || params?.route || '')
    if (!page) return null
  }

  return {
    text,
    action,
    params: {
      ...params,
      task_id: matchedTask?.id || (params?.task_id != null ? String(params.task_id) : null)
    },
    needs_confirmation: needsConfirmation
  }
}

export const buildAssistantFunction = (action, params = {}) => {
  const safeAction = String(action || '').trim()

  switch (safeAction) {
    case 'start_focus':
      return {
        action: 'start_focus',
        params: {
          task_id: params?.task_id == null ? null : String(params.task_id),
          subject: String(params?.subject || '').trim() || null,
          duration: Number(params?.duration ?? params?.duration_min ?? 30) || 30
        }
      }
    case 'pause_session':
    case 'resume_session':
    case 'open_tasks':
    case 'open_study':
    case 'open_dashboard':
    case 'finish_session':
      return { action: safeAction, params: {} }
    case 'create_task':
      return {
        action: 'create_task',
        params: {
          title: String(params?.title || '').trim(),
          subject: String(params?.subject || '').trim() || null,
          due_date: params?.due_date || params?.dueDate || null
        }
      }
    case 'delete_task':
    case 'complete_task':
    case 'select_task':
      return {
        action: safeAction,
        params: {
          task_id: params?.task_id == null ? null : String(params.task_id)
        }
      }
    case 'reschedule_task':
      return {
        action: 'reschedule_task',
        params: {
          task_id: params?.task_id == null ? null : String(params.task_id),
          date: params?.date || null
        }
      }
    case 'start_free_session':
      return {
        action: 'start_free_session',
        params: {
          duration: Number(params?.duration ?? params?.duration_min ?? 30) || 30
        }
      }
    case 'navigate':
      return {
        action: 'navigate',
        params: {
          page: normalizeAssistantPage(params?.page || params?.route || '')
        }
      }
    case 'none':
      return { action: 'none', params: {} }
    default:
      return null
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
  const input = buildAssistantVoiceAiInput({
    transcript,
    context,
    tasks: context?.rawTasks || []
  })

  const result = await fetchAssistantAi({
    endpoint: '/api/assistant-recommendation',
    body: {
      mode: 'voice',
      input
    },
    context,
    signal,
    force: true
  })

  if (!result.ok) return result

  const output = validateAssistantVoiceOutput(result.output, input)
  if (!output) return { ok: false, reason: 'invalid_output' }

  return { ok: true, output, source: result.source }
}

export const buildAssistantNoneVoiceOutput = (text = 'No action') => ({
  text,
  action: 'none',
  params: {},
  needs_confirmation: true
})

const buildVoiceDecisionFromOutput = ({ output, tasks = [] }) => {
  const functionCall = buildAssistantFunction(output?.action, output?.params || {})
  if (!functionCall) return null

  const params = functionCall.params || {}
  const matchedTask = findVoiceTaskMatch(tasks, params)
  const detail = output?.needs_confirmation
    ? 'Swipe right to confirm or left to cancel.'
    : 'Ready to run.'

  const buildVoiceIntentDecision = ({ key, type, title, tone = 'suggestion', task = matchedTask, intent }) => ({
    key,
    state: 'suggesting',
    origin: 'voice',
    type,
    status: 'VOICE',
    tone,
    title,
    shortMessage: title,
    detail,
    task,
    voiceIntent: intent,
    action: {
      kind: 'voice_intent',
      intent
    }
  })

  switch (functionCall.action) {
    case 'start_focus': {
      const subject = String(params?.subject || matchedTask?.subject || '').trim()
      const query = normalizeTaskTitle(matchedTask?.title || params?.title || params?.query || subject)
      return buildVoiceIntentDecision({
        key: `voice-ai:start_focus:${matchedTask?.id || subject || 'task'}`,
        type: 'start_focus',
        title: output.text,
        task: matchedTask,
        intent: {
          type: 'start_focus',
          data: {
            query,
            subject,
            duration: Number(params?.duration ?? params?.duration_min ?? 30) || 30
          }
        }
      })
    }

    case 'create_task':
      return {
        key: `voice-ai:create_task:${sanitizeTaskLookup(params?.title || 'task') || 'task'}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'create_task',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: null,
        action: {
          kind: 'create_task',
          title: String(params?.title || '').trim(),
          subject: String(params?.subject || '').trim() || 'math',
          dueDate: params?.due_date || params?.dueDate || null
        }
      }

    case 'pause_session':
    case 'resume_session':
    case 'finish_session':
      return buildVoiceIntentDecision({
        key: `voice-ai:${functionCall.action}`,
        type: functionCall.action,
        title: output.text,
        tone: 'suggestion',
        task: null,
        intent:
          functionCall.action === 'pause_session'
            ? { type: 'pause', data: {} }
            : functionCall.action === 'resume_session'
              ? { type: 'resume', data: {} }
              : { type: 'finish_session', data: {} }
      })

    case 'open_tasks':
      return {
        key: 'voice-ai:open_tasks',
        state: 'suggesting',
        origin: 'voice',
        type: 'open_tasks',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        action: {
          kind: 'navigate',
          path: '/tasks'
        }
      }

    case 'open_study':
      return {
        key: 'voice-ai:open_study',
        state: 'suggesting',
        origin: 'voice',
        type: 'open_study',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        action: {
          kind: 'navigate',
          path: '/study'
        }
      }

    case 'open_dashboard':
      return {
        key: 'voice-ai:open_dashboard',
        state: 'suggesting',
        origin: 'voice',
        type: 'open_dashboard',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        action: {
          kind: 'navigate',
          path: '/dashboard'
        }
      }

    case 'complete_task':
      return {
        key: `voice-ai:complete_task:${matchedTask?.id || params?.task_id || 'task'}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'complete_task',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: matchedTask,
        action: {
          kind: 'complete_task',
          taskId: matchedTask?.id || params?.task_id || null
        }
      }

    case 'delete_task':
      return {
        key: `voice-ai:delete_task:${matchedTask?.id || params?.task_id || 'task'}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'delete_task',
        status: 'VOICE',
        tone: 'warning',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: matchedTask,
        action: {
          kind: 'delete_task',
          taskId: matchedTask?.id || params?.task_id || null
        }
      }

    case 'navigate':
      return {
        key: `voice-ai:navigate:${String(params?.page || '/dashboard')}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'navigate',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: null,
        action: {
          kind: 'navigate',
          path: String(params?.page || '/dashboard')
        }
      }

    case 'start_free_session':
      return {
        key: `voice-ai:start_free_session:${Number(params?.duration ?? params?.duration_min ?? 30) || 30}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'start_free_session',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        action: {
          kind: 'navigate',
          path: '/study',
          state: {
            action: 'start',
            mode: 'free',
            duration: Number(params?.duration ?? params?.duration_min ?? 30) || 30,
            taskId: null
          }
        }
      }

    case 'select_task':
      return {
        key: `voice-ai:select_task:${matchedTask?.id || params?.task_id || 'task'}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'select_task',
        status: 'VOICE',
        tone: 'suggestion',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: matchedTask,
        action: {
          kind: 'navigate',
          path: '/study',
          state: {
            suggestedTaskId: matchedTask?.id || params?.task_id || null
          }
        }
      }

    case 'reschedule_task':
      return {
        key: `voice-ai:reschedule_task:${matchedTask?.id || params?.task_id || 'task'}`,
        state: 'suggesting',
        origin: 'voice',
        type: 'reschedule_task',
        status: 'VOICE',
        tone: 'warning',
        title: output.text,
        shortMessage: output.text,
        detail,
        task: matchedTask,
        action: {
          kind: 'reschedule_task',
          taskId: matchedTask?.id || params?.task_id || null,
          date: params?.date || null
        }
      }

    case 'none':
    default:
      return {
        key: 'voice-ai:none',
        state: 'suggesting',
        origin: 'voice',
        type: 'idle',
        status: 'VOICE',
        tone: 'neutral',
        title: output?.text || 'No action',
        shortMessage: output?.text || 'No action',
        detail,
        action: {
          kind: 'idle'
        }
      }
  }
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
  if (output && typeof output === 'object' && ('params' in output || 'needs_confirmation' in output)) {
    return buildVoiceDecisionFromOutput({ output, tasks })
  }

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

export const resolveAssistantVoicePipeline = async ({
  transcript,
  context,
  tasks = [],
  signal
}) => {
  const cleanTranscript = String(transcript || '').trim()
  if (!cleanTranscript) {
    return {
      ok: false,
      reason: 'empty_transcript',
      output: null,
      decision: null
    }
  }

  const resolved = await fetchAssistantVoiceDecision({
    transcript: cleanTranscript,
    context,
    signal
  })

  const buildNoneDecision = (text = 'No action') => {
    const output = buildAssistantNoneVoiceOutput(text)
    const decision = buildAssistantDecisionFromAi({
      output,
      context,
      tasks,
      origin: 'voice',
      confirm: true
    })

    return {
      ok: true,
      output,
      decision,
      source: 'none-fallback'
    }
  }

  if (!resolved?.ok || !resolved.output) {
    if (resolved?.reason === 'invalid_output') {
      return buildNoneDecision('No action')
    }
    return {
      ok: false,
      reason: resolved?.reason || 'voice_failed',
      output: null,
      decision: null
    }
  }

  const decision = buildAssistantDecisionFromAi({
    output: resolved.output,
    context,
    tasks,
    origin: 'voice',
    confirm: true
  })

  if (!decision) {
    return buildNoneDecision('No action')
  }

  return {
    ok: true,
    output: resolved.output,
    decision,
    source: resolved.source
  }
}
