const STORAGE_PREFIX = 'easybac:cognitive-load'

const isBrowser = typeof window !== 'undefined'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const getKey = (userId) => `${STORAGE_PREFIX}:${userId || 'guest'}`

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

const clearJson = (key) => {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

const normalizeProfile = (userState = {}) => {
  const source =
    userState?.personalization ||
    userState?.profile ||
    userState?.preferences ||
    userState ||
    {}

  const weakSubjects = Array.isArray(source.weakSubjects)
    ? source.weakSubjects
    : Array.isArray(source.weak_subjects)
      ? source.weak_subjects
      : []

  return {
    level: source.level || 'Average',
    weakSubjects,
    studyHours: source.studyHours || source.study_time || '2–4h',
    goal: source.goal || 'Pass',
    focusIssues: Array.isArray(source.focusIssues)
      ? source.focusIssues
      : Array.isArray(source.focus_issues)
        ? source.focus_issues
        : [],
    isPersonalized: source.isPersonalized === true
  }
}

const getExpectedSessionMinutes = (profile, studySessions = []) => {
  const base =
    profile.level === 'Good' ? 42 : profile.level === 'Struggling' ? 28 : 34
  const hoursAdjust =
    profile.studyHours === '4h+'
      ? 8
      : profile.studyHours === 'Less than 2h'
        ? -6
        : 0
  const recentDurations = studySessions
    .map((session) => Number(session?.duration_minutes || session?.durationMinutes || 0) || 0)
    .filter(Boolean)
    .slice(0, 10)

  const recentAverage = recentDurations.length
    ? recentDurations.reduce((sum, value) => sum + value, 0) / recentDurations.length
    : 0

  const averageAdjust = recentAverage ? Math.round((recentAverage - base) * 0.35) : 0
  return clamp(Math.round(base + hoursAdjust + averageAdjust), 20, 60)
}

const getCompletionRate = (tasks = []) => {
  if (!tasks.length) return 0
  const completed = tasks.filter(
    (task) => task?.completed === true || task?.status === 'completed'
  ).length
  return completed / tasks.length
}

const getRecentSessionMinutes = (studySessions = []) => {
  return studySessions
    .slice(0, 5)
    .reduce((sum, session) => sum + (Number(session?.duration_minutes || session?.durationMinutes || 0) || 0), 0)
}

const getTelemetry = (userId) =>
  readJson(getKey(userId), {
    version: 1,
    updatedAt: Date.now(),
    lastActivityAt: null,
    lastInteractionAt: null,
    currentSession: {
      startedAt: null,
      pauseCount: 0,
      taskSwitchCount: 0,
      interruptionCount: 0,
      rapidInteractionCount: 0,
      activityCount: 0
    },
    totals: {
      pauseCount: 0,
      taskSwitchCount: 0,
      interruptionCount: 0,
      rapidInteractionCount: 0,
      sessionCount: 0
    },
    lastSessionSummary: null,
    learning: {
      sensitivity: 1
    }
  })

export const readCognitiveTelemetry = (userId) => getTelemetry(userId)

export const clearCognitiveTelemetry = (userId) => {
  if (!userId) return
  clearJson(getKey(userId))
}

export const recordCognitiveSignal = (userId, signal = {}) => {
  if (!userId) return null

  const now = Number(signal.timestamp) || Date.now()
  const telemetry = getTelemetry(userId)
  const currentSession = telemetry.currentSession || {
    startedAt: null,
    pauseCount: 0,
    taskSwitchCount: 0,
    interruptionCount: 0,
    rapidInteractionCount: 0,
    activityCount: 0
  }

  const updateCurrent = () => {
    telemetry.currentSession = currentSession
    telemetry.updatedAt = now
    writeJson(getKey(userId), telemetry)
    return telemetry
  }

  if (signal.type === 'session_start') {
    telemetry.currentSession = {
      startedAt: now,
      pauseCount: 0,
      taskSwitchCount: 0,
      interruptionCount: 0,
      rapidInteractionCount: 0,
      activityCount: 0
    }
    telemetry.totals.sessionCount += 1
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    telemetry.lastSessionSummary = null
    telemetry.updatedAt = now
    writeJson(getKey(userId), telemetry)
    return telemetry
  }

  if (signal.type === 'session_end') {
    telemetry.lastSessionSummary = {
      ...currentSession,
      endedAt: now
    }
    telemetry.currentSession = {
      startedAt: null,
      pauseCount: 0,
      taskSwitchCount: 0,
      interruptionCount: 0,
      rapidInteractionCount: 0,
      activityCount: 0
    }
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    telemetry.updatedAt = now
    writeJson(getKey(userId), telemetry)
    return telemetry
  }

  if (signal.type === 'pause') {
    currentSession.pauseCount += 1
    telemetry.totals.pauseCount += 1
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    telemetry.lastPauseAt = now
    return updateCurrent()
  }

  if (signal.type === 'task_switch') {
    currentSession.taskSwitchCount += 1
    telemetry.totals.taskSwitchCount += 1
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    telemetry.lastTaskSwitchAt = now
    return updateCurrent()
  }

  if (signal.type === 'interruption') {
    currentSession.interruptionCount += 1
    telemetry.totals.interruptionCount += 1
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    telemetry.lastInterruptionAt = now
    return updateCurrent()
  }

  if (signal.type === 'interaction' || signal.type === 'activity') {
    const previous = Number(telemetry.lastInteractionAt) || 0
    if (previous && now - previous < 650) {
      currentSession.rapidInteractionCount += 1
      telemetry.totals.rapidInteractionCount += 1
    }

    currentSession.activityCount += 1
    telemetry.lastActivityAt = now
    telemetry.lastInteractionAt = now
    return updateCurrent()
  }

  telemetry.updatedAt = now
  writeJson(getKey(userId), telemetry)
  return telemetry
}

const getSessionDurationMinutes = (telemetry, now) => {
  const startedAt = telemetry?.currentSession?.startedAt || telemetry?.lastSessionSummary?.startedAt
  if (!startedAt) return 0
  return Math.max(0, Math.round((now.getTime() - Number(startedAt)) / 60000))
}

export const computeCognitiveLoad = (userState = {}, appData = {}) => {
  const profile = normalizeProfile(userState)
  const tasks = Array.isArray(appData.tasks) ? appData.tasks : []
  const studySessions = Array.isArray(appData.studySessions) ? appData.studySessions : []
  const now = appData.now ? new Date(appData.now) : new Date()
  const userId = appData.userId || userState?.id || userState?.userId || null
  const telemetry = appData.cognitiveTelemetry || (userId ? getTelemetry(userId) : null)
  const timerState = appData.timerState || null

  const activeSession = telemetry?.currentSession || telemetry?.lastSessionSummary || {}
  const sessionDurationMinutes =
    Number(appData.sessionMinutes) ||
    Number(appData.activeSessionMinutes) ||
    getSessionDurationMinutes(telemetry, now)
  const hasStudyContext =
    Boolean(timerState?.isRunning) ||
    sessionDurationMinutes > 0 ||
    Boolean(activeSession?.startedAt)

  const inactivitySecondsFromTelemetry = telemetry?.lastInteractionAt
    ? Math.max(0, Math.floor((now.getTime() - Number(telemetry.lastInteractionAt)) / 1000))
    : null

  const inactivitySeconds =
    Number(appData.inactivitySeconds) ||
    inactivitySecondsFromTelemetry ||
    0

  const pauseCount = Number(activeSession.pauseCount || 0) + Number(appData.pauseCount || 0)
  const taskSwitchCount =
    Number(activeSession.taskSwitchCount || 0) + Number(appData.taskSwitchCount || 0)
  const interruptionCount =
    Number(activeSession.interruptionCount || 0) + Number(appData.interruptionCount || 0)
  const rapidInteractionCount =
    Number(activeSession.rapidInteractionCount || 0) + Number(appData.rapidInteractionCount || 0)

  const completionRate = getCompletionRate(tasks)
  const expectedMinutes = clamp(
    Number(appData.expectedSessionMinutes) || getExpectedSessionMinutes(profile, studySessions),
    20,
    60
  )

  let loadScore = 8
  loadScore += pauseCount * 14
  loadScore += taskSwitchCount * 12
  loadScore += interruptionCount * 16
  loadScore += hasStudyContext ? Math.floor(inactivitySeconds / 45) * 10 : 0
  loadScore += rapidInteractionCount * 5

  if (completionRate < 0.4) loadScore += 10
  else if (completionRate > 0.75) loadScore -= 6

  if (sessionDurationMinutes < expectedMinutes * 0.5 && (pauseCount > 0 || interruptionCount > 0)) {
    loadScore += 10
  }

  if (
    timerState?.isRunning &&
    sessionDurationMinutes >= expectedMinutes * 0.8 &&
    pauseCount <= 1 &&
    taskSwitchCount <= 1 &&
    inactivitySeconds < 20
  ) {
    loadScore -= 18
  }

  if (hasStudyContext && !timerState?.isRunning && inactivitySeconds > 150) {
    loadScore += 12
  }

  loadScore = clamp(loadScore, 0, 100)

  const level = loadScore >= 65 ? 'high' : loadScore >= 35 ? 'medium' : 'low'

  let state = 'normal'
  if (hasStudyContext && inactivitySeconds >= 120) {
    state = 'disengaged'
  } else if (loadScore >= 70 || interruptionCount >= 3 || taskSwitchCount >= 4) {
    state = 'overloaded'
  } else if (loadScore >= 45 || pauseCount >= 2 || (completionRate < 0.45 && sessionDurationMinutes < 25)) {
    state = 'struggling'
  } else if (
    timerState?.isRunning &&
    sessionDurationMinutes >= expectedMinutes * 0.8 &&
    pauseCount <= 1 &&
    taskSwitchCount <= 1 &&
    inactivitySeconds < 20
  ) {
    state = 'flow'
  }

  const signalCount =
    pauseCount + taskSwitchCount + interruptionCount + rapidInteractionCount + (timerState?.isRunning ? 1 : 0)
  const historyWeight = Math.min(0.18, studySessions.length * 0.01)
  const confidence = clamp(0.42 + Math.min(0.35, signalCount * 0.05) + historyWeight, 0.35, 0.95)

  const messages = {
    flow: {
      message: 'In flow',
      fullMessage: 'The session is stable. Avoid interruptions and let the current block continue.',
      action: 'keep_going'
    },
    normal: {
      message: 'Stable',
      fullMessage: 'Cognitive load is balanced. Keep the current rhythm.',
      action: 'none'
    },
    struggling: {
      message: 'Struggling',
      fullMessage: 'The user is showing strain. Suggest an easier task or a shorter block.',
      action: 'switch_task'
    },
    overloaded: {
      message: 'Overloaded',
      fullMessage: 'The user is overloaded. Suggest a short break before resuming.',
      action: 'break'
    },
    disengaged: {
      message: 'Disengaged',
      fullMessage: 'The user appears disengaged. Prompt a re-entry with a short session.',
      action: 'reengage'
    }
  }

  const selected = messages[state] || messages.normal

  return {
    score: loadScore,
    level,
    state,
    confidence,
    reason:
      state === 'flow'
        ? 'Long uninterrupted session with minimal friction.'
        : state === 'overloaded'
          ? 'Frequent interruptions and switching indicate overload.'
          : state === 'struggling'
            ? 'Pause frequency and low progress indicate strain.'
            : state === 'disengaged'
              ? 'Inactivity suggests the user has drifted away.'
              : 'Behavior is balanced and stable.',
    message: selected.message,
    fullMessage: selected.fullMessage,
    action: selected.action,
    suppressNotifications: state === 'flow',
    shouldAutoAdapt: state !== 'normal' && state !== 'flow',
    indicators: {
      inactivitySeconds,
      pauseCount,
      taskSwitchCount,
      interruptionCount,
      rapidInteractionCount,
      sessionDurationMinutes,
      expectedMinutes,
      completionRate
    }
  }
}

export const adaptToCognitiveState = (loadState, context = {}) => {
  if (!loadState) {
    return {
      action: 'none',
      shouldAutoApply: false,
      suppressNotifications: false
    }
  }

  const autopilotActive = Boolean(context.autopilotActive)
  const critical = loadState.state === 'overloaded' || loadState.state === 'disengaged'

  if (loadState.state === 'flow') {
    return {
      action: 'none',
      shouldAutoApply: false,
      suppressNotifications: true,
      message: 'In flow',
      fullMessage: 'Stay with the current session and avoid interruptions.',
      tone: 'active'
    }
  }

  if (loadState.state === 'overloaded') {
    return {
      action: autopilotActive ? 'break' : 'suggest_break',
      shouldAutoApply: autopilotActive,
      suppressNotifications: false,
      message: 'Take a 5 min break',
      fullMessage: 'The session is overloaded. A short break will reduce strain.',
      tone: 'danger',
      critical
    }
  }

  if (loadState.state === 'struggling') {
    return {
      action: autopilotActive ? 'switch_task' : 'switch_task',
      shouldAutoApply: autopilotActive,
      suppressNotifications: false,
      message: 'Switch to easier task',
      fullMessage: 'Lower the difficulty and rebuild momentum with a simpler task.',
      tone: 'warning',
      critical: false
    }
  }

  if (loadState.state === 'disengaged') {
    return {
      action: autopilotActive ? 'reengage' : 'reengage',
      shouldAutoApply: autopilotActive,
      suppressNotifications: false,
      message: 'Re-engage now',
      fullMessage: 'The user seems disconnected. Prompt a short re-entry session.',
      tone: 'warning',
      critical
    }
  }

  return {
    action: 'none',
    shouldAutoApply: false,
    suppressNotifications: false,
    message: 'Stable',
    fullMessage: 'Cognitive load is balanced.',
    tone: 'neutral'
  }
}
