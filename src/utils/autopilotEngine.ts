import { getBestTask, getOptimalSessionLength } from './aiEngine.ts'

export const AUTOPILOT_STATE_KEY_PREFIX = 'easybac:autopilot-state'
export const PENDING_STUDY_ACTION_KEY = 'assistant-pending-study-action'

const isBrowser = typeof window !== 'undefined'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeSubject = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const getAutopilotKey = (userId) => `${AUTOPILOT_STATE_KEY_PREFIX}:${userId || 'guest'}`

const readJson = (key, fallback = null) => {
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
    // Ignore storage failures.
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

const queuePendingStudyAction = (payload) => {
  if (!isBrowser) return
  window.sessionStorage.setItem(PENDING_STUDY_ACTION_KEY, JSON.stringify(payload))
}

const getCandidateReason = (task, profile) => {
  const weakSubjects = (profile?.weakSubjects || profile?.personalization?.weakSubjects || []).map(
    (item) => normalizeSubject(item)
  )
  const subject = normalizeSubject(task?.subject || '')
  const dueDate = task?.due_date || null
  const todayKey = new Date().toISOString().slice(0, 10)

  if (dueDate && dueDate < todayKey) return 'overdue'
  if (dueDate === todayKey) return 'due today'
  if (dueDate) return 'due soon'
  if (weakSubjects.includes(subject)) return 'weak subject'
  if ((task?.totalFocusTime || task?.total_focus_time || 0) === 0) return 'no focus history'
  return 'best next task'
}

const pickEasierTask = (tasks = [], currentTaskId = null) => {
  const pending = tasks.filter(
    (task) =>
      task?.id !== currentTaskId &&
      task?.completed !== true &&
      task?.status !== 'completed' &&
      task?.status !== 'on_hold'
  )

  if (!pending.length) return null

  return [...pending].sort((a, b) => {
    const scoreTask = (task) => {
      const focus = Number(task?.totalFocusTime ?? task?.total_focus_time ?? 0) || 0
      const sessions = Number(task?.sessionsCount ?? task?.sessions_count ?? 0) || 0
      const due = task?.due_date ? new Date(task.due_date).getTime() : Number.POSITIVE_INFINITY
      return focus + sessions * 6 + due / 1e12
    }

    return scoreTask(a) - scoreTask(b)
  })[0]
}

export const buildAutopilotPlan = ({ user, tasks = [], studySessions = [], now = new Date() }) => {
  const bestTask = getBestTask(tasks, user?.personalization || user)
  const optimal = getOptimalSessionLength(user, { tasks, studySessions, now })
  const fallbackTitle = bestTask?.title || 'Free focus session'
  const fallbackSubject = bestTask?.subject || 'General'

  if (!bestTask) {
    return {
      active: false,
      taskId: null,
      title: 'Free focus session',
      subject: fallbackSubject,
      duration: optimal.minutes,
      mode: 'pomodoro',
      strategy: 'free-session',
      reason: 'No task is ready. Autopilot will use a free focus block and keep the session moving.',
      actionLabel: 'Start Autopilot',
      actionPath: '/study'
    }
  }

  return {
    active: true,
    taskId: bestTask.id,
    title: fallbackTitle,
    subject: fallbackSubject,
    duration: optimal.minutes,
    mode: 'pomodoro',
    strategy: getCandidateReason(bestTask, user?.personalization || user),
    reason: `Autopilot will start "${fallbackTitle}" for ${optimal.minutes} minutes and adjust from there.`,
    actionLabel: 'Start Autopilot',
    actionPath: '/study'
  }
}

export const createAutopilotLaunchPayload = (plan) => ({
  action: 'start',
  mode: plan?.mode || 'pomodoro',
  duration: plan?.duration || 45,
  taskId: plan?.taskId || null,
  autopilot: true,
  title: plan?.title || 'Autopilot',
  subject: plan?.subject || 'General',
  reason: plan?.reason || '',
  strategy: plan?.strategy || 'best-task'
})

export const persistAutopilotState = (userId, state) => {
  if (!userId) return
  writeJson(getAutopilotKey(userId), {
    ...state,
    updatedAt: Date.now()
  })
}

export const readAutopilotState = (userId) => {
  if (!userId) return null
  return readJson(getAutopilotKey(userId), null)
}

export const clearAutopilotState = (userId) => {
  if (!userId) return
  removeItem(getAutopilotKey(userId))
}

export const queueAutopilotLaunch = ({ userId, plan }) => {
  const payload = createAutopilotLaunchPayload(plan)
  queuePendingStudyAction(payload)
  if (userId) {
    persistAutopilotState(userId, {
      active: true,
      plan,
      taskId: payload.taskId,
      title: payload.title,
      subject: payload.subject,
      mode: payload.mode,
      duration: payload.duration,
      reason: payload.reason,
      strategy: payload.strategy,
      startedAt: Date.now(),
      lastAdjustmentAt: Date.now(),
      extensions: 0,
      pauseCount: 0,
      inactivitySeconds: 0
    })
  }
  return payload
}

export const evaluateAutopilotSession = ({
  state,
  tasks = [],
  currentTaskId = null,
  sessionMinutes = 0,
  inactivitySeconds = 0,
  pauseCount = 0,
  tabSwitchCount = 0,
  now = Date.now()
}) => {
  if (!state?.active) return null

  const minutes = Number(sessionMinutes) || 0
  const currentDuration = Number(state.duration) || 45
  const lastAdjustmentAt = Number(state.lastAdjustmentAt) || 0
  const timeSinceAdjust = now - lastAdjustmentAt

  if (inactivitySeconds >= 90) {
    return {
      type: 'suggestion',
      action: 'break',
      message: 'Take a short break',
      fullMessage: 'You have been inactive for a while. Take a short break or restart focus.',
      note: 'Inactivity detected'
    }
  }

  if (pauseCount >= 2) {
    const easierTask = pickEasierTask(tasks, currentTaskId)
    if (easierTask) {
      return {
        type: 'suggestion',
        action: 'switch_task',
        taskId: easierTask.id,
        message: 'Switch task',
        fullMessage: `You paused often. Switch to "${easierTask.title}" and keep momentum stable.`,
        note: 'Lower-friction task'
      }
    }
  }

  if (tabSwitchCount >= 2) {
    const easierTask = pickEasierTask(tasks, currentTaskId)
    if (easierTask) {
      return {
        type: 'suggestion',
        action: 'switch_task',
        taskId: easierTask.id,
        message: 'Switch task',
        fullMessage: `You switched away often. Move to "${easierTask.title}" to keep the session stable.`,
        note: 'Tab switching detected'
      }
    }
  }

  if (
    minutes >= Math.max(18, currentDuration - 5) &&
    timeSinceAdjust > 8 * 60 * 1000 &&
    pauseCount === 0 &&
    inactivitySeconds < 20 &&
    currentDuration < 60
  ) {
    return {
      type: 'suggestion',
      action: 'extend',
      delta: 5,
      message: 'Extend 5 min',
      fullMessage: 'You are focused. Extending this session by 5 minutes should pay off.',
      note: 'Strong focus'
    }
  }

  if (
    minutes >= 10 &&
    timeSinceAdjust > 8 * 60 * 1000 &&
    pauseCount >= 1 &&
    currentDuration > 25
  ) {
    return {
      type: 'suggestion',
      action: 'shorten',
      delta: 5,
      message: 'Shorten session',
      fullMessage: 'You are losing momentum. Shortening the next block will keep the quality up.',
      note: 'Reduce fatigue'
    }
  }

  return null
}

export const describeAutopilotPlan = (plan) => {
  if (!plan) return 'Autopilot is ready.'
  return plan.taskId
    ? `Autopilot will start ${plan.title} for ${plan.duration} minutes.`
    : `Autopilot will start a ${plan.duration}-minute free focus block.`
}

export const findAutopilotFollowUp = (tasks = [], currentTaskId = null) =>
  pickEasierTask(tasks, currentTaskId)
