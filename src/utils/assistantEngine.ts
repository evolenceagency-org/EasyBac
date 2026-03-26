import { buildAutopilotPlan, createAutopilotLaunchPayload, readAutopilotState } from './autopilotEngine.ts'
import { buildExamSimulationPlan } from './examEngine.ts'
import { generateAssistantState, getBestTask, getShortMessage } from './aiEngine.ts'
import { formatFocusSummary } from './focusTasks.js'
import { readAiControlCenterSettings } from './aiControlCenter.js'
import { toDateKey } from './dateUtils.js'

const DEFAULT_PAGE = 'dashboard'
const PAGE_ALIASES = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/tasks': 'tasks',
  '/study': 'study',
  '/analytics': 'analytics'
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const normalizeText = (value) =>
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toSubjectLabel = (value) => {
  const text = normalizeText(value)
  if (!text) return 'Task'
  return text
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const normalizePage = (value) => {
  if (!value) return DEFAULT_PAGE
  if (PAGE_ALIASES[value]) return PAGE_ALIASES[value]
  const cleaned = String(value).split('?')[0].split('#')[0]
  return PAGE_ALIASES[cleaned] || cleaned.replace(/^\//, '') || DEFAULT_PAGE
}

const safeDateMs = (value) => {
  if (!value) return null
  const ms = new Date(value).getTime()
  return Number.isNaN(ms) ? null : ms
}

const getSessionDuration = (session) =>
  Number(session?.duration_minutes ?? session?.durationMinutes ?? session?.duration ?? 0) || 0

const getActiveTask = (tasks = [], activeTask, activeTaskId) => {
  if (activeTask?.id) return activeTask
  if (activeTaskId) return tasks.find((task) => task?.id === activeTaskId) || null
  return null
}

const getExamUrgency = (examPlan, currentPage) => {
  if (!examPlan) return 0

  const explicitDays = Number(examPlan.deadlineDays ?? examPlan.daysLeft ?? examPlan.daysUntilExam ?? examPlan.remainingDays)
  if (Number.isFinite(explicitDays)) {
    return clamp(1 - clamp(explicitDays, 0, 30) / 30, 0, 1)
  }

  const examDateMs = safeDateMs(examPlan.examDate || examPlan.dueDate || examPlan.targetDate)
  if (examDateMs) {
    const daysLeft = (examDateMs - Date.now()) / (24 * 60 * 60 * 1000)
    return clamp(1 - clamp(daysLeft, 0, 30) / 30, 0, 1)
  }

  if (currentPage === 'dashboard') return 0.72
  if (currentPage === 'tasks') return 0.58
  if (currentPage === 'study') return 0.48
  return 0.32
}

const mapCognitiveState = (loadState) => {
  const state = loadState?.state || 'normal'
  if (state === 'overloaded') return 'overloaded'
  if (state === 'disengaged') return 'disengaged'
  return 'focused'
}

const isHighCognitivePressure = (loadState) => {
  const state = loadState?.state
  return state === 'overloaded' || state === 'disengaged' || state === 'struggling'
}

const toLegacyType = (assistantState) => {
  switch (assistantState) {
    case 'autopilot':
      return 'timer'
    case 'exam':
      return 'alert'
    case 'timer':
      return 'timer'
    case 'warning':
      return 'alert'
    case 'suggesting':
      return 'suggestion'
    default:
      return 'suggestion'
  }
}

const buildRecommendationDuration = ({ assistantState, autopilotPlan, examPlan, candidate, cognitiveLoad, baseState }) => {
  if (assistantState === 'autopilot') return Number(autopilotPlan?.duration || 0) || 0
  if (assistantState === 'exam') return Number(examPlan?.durationMinutes || 0) || 0

  const recommendedSession = candidate?.session || baseState?.metadata?.recommendedSession || null
  const optimal = Number(baseState?.metadata?.predictions?.optimalSessionLength || recommendedSession?.duration || 0) || 0

  if (assistantState === 'timer') return Number(recommendedSession?.duration || optimal || 0) || 0

  if (assistantState === 'warning') {
    if (cognitiveLoad?.state === 'overloaded') return clamp(Math.max(15, optimal - 8), 12, 30)
    if (cognitiveLoad?.state === 'disengaged') return clamp(Math.max(12, optimal - 12), 10, 25)
    if (cognitiveLoad?.state === 'struggling') return clamp(Math.max(20, optimal - 5), 15, 35)
  }

  return Number(recommendedSession?.duration || optimal || 0) || 0
}

const buildQuickActions = ({
  assistantState,
  currentPage,
  bestTask,
  recommendation,
  recommendationReason,
  suggestedDuration,
  autopilotPlan,
  autopilotActive,
  examPlan,
  examAvailable,
  voiceEnabled
}) => {
  const actions = []
  const add = (item) => {
    if (!item || actions.length >= 3) return
    actions.push(item)
  }

  const taskState = bestTask
    ? {
        taskId: bestTask.id,
        action: 'start',
        mode: suggestedDuration ? 'pomodoro' : 'free'
      }
    : null

  const startStudyAction = {
    id: 'start_session',
    label: assistantState === 'timer' ? 'Open Study' : 'Start Session',
    kind: 'navigate',
    path: '/study',
    state: taskState,
    variant: 'primary',
    icon: 'play'
  }

  const openTasksAction = {
    id: 'open_tasks',
    label: 'Open Tasks',
    kind: 'navigate',
    path: '/tasks',
    variant: assistantState === 'warning' ? 'primary' : 'secondary',
    icon: 'list'
  }

  const controlCenterAction = {
    id: 'control_center',
    label: 'Control Center',
    kind: 'navigate',
    path: '/ai-control-center',
    variant: 'ghost',
    icon: 'settings'
  }

  const autopilotAction = {
    id: 'start_autopilot',
    label: autopilotActive ? 'Open Study' : 'Start Autopilot',
    kind: autopilotActive ? 'navigate' : 'autopilot',
    path: '/study',
    state: autopilotActive ? null : createAutopilotLaunchPayload(autopilotPlan),
    plan: autopilotPlan,
    variant: 'primary',
    icon: 'sparkles'
  }

  const examAction = {
    id: 'start_exam',
    label: 'Start Exam',
    kind: 'exam',
    path: '/exam-simulation',
    state: { ...(examPlan || {}), autoStart: true },
    variant: 'primary',
    icon: 'graduation-cap'
  }

  const analyticsAction = {
    id: 'open_analytics',
    label: 'Open Analytics',
    kind: 'navigate',
    path: '/analytics',
    variant: 'secondary',
    icon: 'brain'
  }

  const voiceAction = {
    id: 'voice',
    label: voiceEnabled ? 'Voice' : 'Type',
    kind: voiceEnabled ? 'voice' : 'text',
    variant: 'ghost',
    icon: voiceEnabled ? 'mic' : 'keyboard'
  }

  if (assistantState === 'autopilot') {
    add(startStudyAction)
    add(controlCenterAction)
    add(openTasksAction)
    return actions
  }

  if (assistantState === 'exam') {
    add(examAction)
    add(currentPage === 'analytics' ? analyticsAction : openTasksAction)
    add(controlCenterAction)
    return actions
  }

  if (assistantState === 'timer') {
    add(startStudyAction)
    add(openTasksAction)
    add(controlCenterAction)
    return actions
  }

  if (assistantState === 'warning') {
    add(openTasksAction)
    add(startStudyAction)
    add(controlCenterAction)
    return actions
  }

  if (assistantState === 'suggesting') {
    add(currentPage === 'analytics' ? analyticsAction : startStudyAction)
    add(openTasksAction)
    if (!autopilotActive && autopilotPlan) add(autopilotAction)
    else add(controlCenterAction)
    return actions
  }

  add(currentPage === 'analytics' ? analyticsAction : startStudyAction)
  add(openTasksAction)
  add(controlCenterAction)
  if (actions.length < 3) add(voiceAction)
  return actions.slice(0, 3)
}

const buildDebugTrace = ({
  assistantState,
  currentPage,
  autopilotActive,
  examUrgency,
  timerActive,
  cognitiveLoad,
  selectedId,
  bestTask
}) => ({
  selectedId,
  currentPage,
  priorityGate: {
    autopilotActive,
    examUrgency,
    timerActive,
    cognitiveState: cognitiveLoad?.state || 'normal'
  },
  bestTask: bestTask ? { id: bestTask.id, title: bestTask.title, subject: bestTask.subject } : null,
  assistantState
})

const createPrimaryCopy = ({ assistantState, candidate, timerState, autopilotPlan, examPlan, bestTask, cognitiveLoad }) => {
  if (assistantState === 'autopilot') {
    return getShortMessage(`Autopilot ${Number(autopilotPlan?.duration || 0) || 0}m`, 24) || 'Autopilot'
  }

  if (assistantState === 'exam') {
    return getShortMessage(`Exam ${Number(examPlan?.durationMinutes || 0) || 0}m`, 24) || 'Exam'
  }

  if (assistantState === 'timer') {
    if (timerState?.formatted) return getShortMessage(`${timerState.formatted} focus`, 24)
    return getShortMessage(candidate?.message || 'Focus session active', 24)
  }

  if (assistantState === 'warning') {
    if (cognitiveLoad?.state === 'overloaded') return 'Take a short break'
    if (cognitiveLoad?.state === 'disengaged') return 'Re-enter with a short session'
    return 'Switch to an easier task'
  }

  if (bestTask) {
    const session = candidate?.session || null
    if (session?.duration) {
      return getShortMessage(`${toSubjectLabel(bestTask.subject)} ${session.duration}m`, 24)
    }
    return getShortMessage(bestTask.title || `Focus ${toSubjectLabel(bestTask.subject)}`, 24)
  }

  return getShortMessage(candidate?.message || 'Ready', 24) || 'Ready'
}

const createRecommendation = ({
  assistantState,
  currentPage,
  bestTask,
  recommendedSession,
  autopilotPlan,
  autopilotActive,
  examPlan,
  candidate
}) => {
  if (assistantState === 'autopilot') {
    return {
      kind: 'autopilot',
      label: autopilotPlan?.title || 'Autopilot',
      plan: autopilotPlan,
      actionState: createAutopilotLaunchPayload(autopilotPlan)
    }
  }

  if (assistantState === 'exam') {
    return {
      kind: 'exam',
      label: examPlan?.subjectLabel || 'Exam',
      plan: examPlan,
      actionState: { ...(examPlan || {}), autoStart: true }
    }
  }

  if (assistantState === 'timer') {
    return {
      kind: 'session',
      label: bestTask?.title || candidate?.desktopTitle || 'Current session',
      task: bestTask || null,
      session: recommendedSession || candidate?.session || null,
      actionState: bestTask ? { taskId: bestTask.id } : null
    }
  }

  if (assistantState === 'warning') {
    return {
      kind: 'session',
      label: bestTask?.title || candidate?.desktopTitle || 'Short session',
      task: bestTask || null,
      session: recommendedSession || candidate?.session || null,
      actionState: bestTask ? { taskId: bestTask.id } : null
    }
  }

  if (bestTask) {
    return {
      kind: currentPage === 'analytics' ? 'insight' : 'task',
      label: bestTask.title || 'Best task',
      task: bestTask,
      session: recommendedSession || candidate?.session || null,
      actionState: bestTask
        ? {
            taskId: bestTask.id,
            ...(recommendedSession ? { mode: 'pomodoro', duration: recommendedSession.duration, action: 'start' } : { action: 'start' })
          }
        : null
    }
  }

  return null
}

export const getAssistantSnapshot = (context = {}) => {
  const tasks = Array.isArray(context.tasks) ? context.tasks : []
  const studySessions = Array.isArray(context.studySessions) ? context.studySessions : []
  const currentPage = normalizePage(context.currentPage || context.pathname)
  const timerState = context.timerState || null
  const activeTask = getActiveTask(tasks, context.activeTask, context.activeTaskId)
  const personalProfile = context.profile?.personalization || context.profile || context.user?.personalization || context.user || {}
  const userId = context.userId || context.profile?.id || context.profile?.userId || context.user?.id || context.user?.userId || null
  const controlSettings = context.aiControlSettings || readAiControlCenterSettings(userId)
  const voiceEnabled = controlSettings?.voice?.enabled !== false
  const assistantVisible = controlSettings?.assistant?.visible !== false
  const assistantModeSetting = controlSettings?.assistant?.mode || 'smart'

  if (!assistantVisible) return null

  const autopilotState = context.autopilotState || readAutopilotState(userId)
  const autopilotPlan = buildAutopilotPlan({
    user: personalProfile,
    tasks,
    studySessions
  })

  const examPlan = context.examPlan || buildExamSimulationPlan(personalProfile, tasks, {
    studySessions,
    subject: 'auto',
    durationMinutes: null,
    difficulty: 'auto'
  })

  const baseState = generateAssistantState(
    { personalization: personalProfile },
    {
      tasks,
      studySessions,
      timerState,
      transientEvent: context.transientEvent || null,
      cognitiveTelemetry: context.cognitiveLoad || null,
      autopilotState,
      userId,
      now: context.now || new Date()
    }
  )

  const bestTask = getBestTask(tasks, personalProfile, context.now || new Date())
  const recommendedSession = baseState.metadata?.recommendedSession || null
  const cognitiveLoad = context.cognitiveLoad || baseState.metadata?.cognitiveLoad || null
  const cognitiveState = mapCognitiveState(cognitiveLoad)
  const autopilotActive = Boolean(autopilotState?.active)
  const autopilotAvailable = Boolean(autopilotPlan && assistantModeSetting !== 'suggest')
  const examAvailable = Boolean(examPlan)
  const examUrgency = getExamUrgency(examPlan, currentPage)
  const timerActive = Boolean(timerState?.isRunning)
  const timerBasePriority = timerActive ? 100 : 0
  const normalizedPressure = isHighCognitivePressure(cognitiveLoad)
  const baseInsightAvailable = baseState?.type === 'insight'
  const pageInsightAllowed = currentPage === 'analytics' && baseInsightAvailable

  const selectedCandidate = (() => {
    if (autopilotActive) {
      return {
        kind: 'autopilot',
        priority: 99,
        assistantState: 'autopilot',
        type: 'timer',
        message: `Autopilot ${Number(autopilotPlan?.duration || 0) || 0}m`,
        fullMessage: autopilotState?.reason || autopilotPlan?.reason || 'Autopilot is managing the current study block.',
        desktopTitle: 'Autopilot running',
        desktopDetail: autopilotState?.reason || autopilotPlan?.reason || 'Autopilot is managing the current study block.',
        session: null,
        metadata: {
          autopilotPlan,
          autopilotActive: true,
          actionState: null,
          icon: 'sparkles',
          tone: 'active',
          actionLabel: 'Open Study',
          actionPath: '/study'
        }
      }
    }

    if (examUrgency >= 0.55) {
      return {
        kind: 'exam',
        priority: 92,
        assistantState: 'exam',
        type: 'alert',
        message: `Exam ${Number(examPlan?.durationMinutes || 0) || 0}m`,
        fullMessage: examPlan?.reason || 'Exam simulation is ready based on your current workload and weak areas.',
        desktopTitle: 'Exam simulation ready',
        desktopDetail: examPlan?.reason || 'Exam simulation is ready based on your current workload and weak areas.',
        session: null,
        metadata: {
          examPlan,
          icon: 'graduation-cap',
          tone: 'warning',
          actionLabel: 'Start Exam',
          actionPath: '/exam-simulation',
          actionState: { ...(examPlan || {}), autoStart: true }
        }
      }
    }

    if (timerActive) {
      const timerSession = context.activeTask || activeTask || bestTask || null
      return {
        kind: 'timer',
        priority: 88,
        assistantState: 'timer',
        type: 'timer',
        message: timerState?.formatted ? `${timerState.formatted} focus` : 'Focus active',
        fullMessage: timerSession
          ? `${toSubjectLabel(timerSession.subject)} • ${formatFocusSummary(timerSession.totalFocusTime, timerSession.sessionsCount)}`
          : 'Focus session is active. Keep the current block steady.',
        desktopTitle: timerSession?.title ? `Working on: ${timerSession.title}` : 'Focus session active',
        desktopDetail: timerSession
          ? `${toSubjectLabel(timerSession.subject)} • ${formatFocusSummary(timerSession.totalFocusTime, timerSession.sessionsCount)}`
          : 'Focus session is active. Keep the current block steady.',
        session: recommendedSession || null,
        metadata: {
          icon: 'timer',
          tone: 'active',
          actionLabel: 'Open Study',
          actionPath: '/study',
          actionState: timerSession?.id ? { taskId: timerSession.id } : null,
          recommendedTaskId: timerSession?.id || null,
          recommendedSession
        }
      }
    }

    if (normalizedPressure) {
      const reason = cognitiveLoad?.fullMessage || cognitiveLoad?.reason || 'Reduce the current load and switch to a lighter block.'
      return {
        kind: 'cognitive',
        priority: 84,
        assistantState: 'warning',
        type: 'alert',
        message:
          cognitiveLoad?.state === 'overloaded'
            ? 'Take a short break'
            : cognitiveLoad?.state === 'disengaged'
              ? 'Re-engage now'
              : 'Switch to an easier task',
        fullMessage: reason,
        desktopTitle:
          cognitiveLoad?.state === 'disengaged'
            ? 'Re-engage now'
            : cognitiveLoad?.state === 'overloaded'
              ? 'Take a short break'
              : 'Switch to an easier task',
        desktopDetail: reason,
        session: recommendedSession || null,
        metadata: {
          icon: cognitiveLoad?.state === 'overloaded' ? 'alert' : 'sparkles',
          tone: 'danger',
          actionLabel: 'Open Tasks',
          actionPath: '/tasks',
          actionState: null,
          cognitiveLoad,
          cognitiveAdaptation: cognitiveLoad?.action || null,
          recommendedTaskId: bestTask?.id || null,
          recommendedSession
        }
      }
    }

    if (pageInsightAllowed) {
      return {
        kind: 'insight',
        priority: 72,
        assistantState: 'suggesting',
        type: 'insight',
        message: getShortMessage(baseState.message, 24),
        fullMessage: baseState.fullMessage || baseState.message,
        desktopTitle: baseState.message,
        desktopDetail: baseState.fullMessage || baseState.message,
        session: recommendedSession || null,
        metadata: {
          icon: 'brain',
          tone: 'info',
          actionLabel: 'Open analytics',
          actionPath: '/analytics',
          actionState: null,
          recommendedSession,
          score: baseState.metadata?.score,
          predictions: baseState.metadata?.predictions,
          dailyPlan: baseState.metadata?.dailyPlan
        }
      }
    }

    if (bestTask) {
      const session = recommendedSession
      return {
        kind: 'task',
        priority: 68,
        assistantState: 'suggesting',
        type: session ? 'suggestion' : 'suggestion',
        message: session
          ? `${toSubjectLabel(bestTask.subject)} ${session.duration}m`
          : getShortMessage(bestTask.title || `Focus ${toSubjectLabel(bestTask.subject)}`, 24),
        fullMessage: session
          ? session.reason || `Start ${toSubjectLabel(bestTask.subject)} for ${session.duration} minutes.`
          : `Best next step is ${bestTask.title || toSubjectLabel(bestTask.subject)}.`,
        desktopTitle: session
          ? `Best session: ${toSubjectLabel(bestTask.subject)} ${session.duration}m`
          : `Best task: ${bestTask.title || 'Untitled task'}`,
        desktopDetail: session
          ? session.reason || `${toSubjectLabel(bestTask.subject)} is the most useful next move.`
          : `${toSubjectLabel(bestTask.subject)} • ${formatFocusSummary(bestTask.totalFocusTime, bestTask.sessionsCount)}`,
        session,
        metadata: {
          icon: 'list',
          tone: 'info',
          actionLabel: 'Start Session',
          actionPath: '/study',
          actionState: {
            taskId: bestTask.id,
            ...(session ? { mode: 'pomodoro', duration: session.duration, action: 'start' } : { action: 'start' })
          },
          recommendedTaskId: bestTask.id,
          recommendedSession: session,
          bestTask
        }
      }
    }

    return {
      kind: 'idle',
      priority: 20,
      assistantState: 'idle',
      type: 'suggestion',
      message: 'Ready',
      fullMessage: 'Ask anything or start a session.',
      desktopTitle: 'Ready',
      desktopDetail: 'Ask anything or start a session.',
      session: null,
      metadata: {
        icon: 'sparkles',
        tone: 'neutral',
        actionLabel: 'Open Tasks',
        actionPath: '/tasks',
        actionState: null
      }
    }
  })()

  const recommendation = createRecommendation({
    assistantState: selectedCandidate.assistantState,
    currentPage,
    bestTask,
    recommendedSession,
    autopilotPlan,
    autopilotActive,
    examPlan,
    candidate: selectedCandidate
  })

  const primaryMessage = getShortMessage(
    selectedCandidate.message || selectedCandidate.desktopTitle || 'Ready',
    28
  )
  const recommendationReason = getShortMessage(
    selectedCandidate.fullMessage || selectedCandidate.desktopDetail || 'Ready to focus.',
    90
  )
  const suggestedDuration = buildRecommendationDuration({
    assistantState: selectedCandidate.assistantState,
    autopilotPlan,
    examPlan,
    candidate: selectedCandidate,
    cognitiveLoad,
    baseState
  })

  const legacyType = toLegacyType(selectedCandidate.assistantState)
  const quickActions = buildQuickActions({
    assistantState: selectedCandidate.assistantState,
    currentPage,
    bestTask,
    recommendation,
    recommendationReason,
    suggestedDuration,
    autopilotPlan,
    autopilotActive,
    examPlan,
    examAvailable,
    voiceEnabled
  })

  const mobileText = primaryMessage
  const mobileExpandedText = getShortMessage(recommendationReason, 26)
  const desktopTitle = selectedCandidate.desktopTitle || primaryMessage
  const desktopDetail = recommendationReason
  const actionLabel = selectedCandidate.metadata?.actionLabel || 'Open'
  const actionPath = selectedCandidate.metadata?.actionPath || '/dashboard'
  const actionState = selectedCandidate.metadata?.actionState || null
  const icon = selectedCandidate.metadata?.icon || 'sparkles'
  const tone = selectedCandidate.metadata?.tone || (legacyType === 'timer' ? 'active' : legacyType === 'alert' ? 'danger' : 'info')

  const snapshot = {
    primaryMessage,
    recommendation,
    recommendationReason,
    suggestedDuration,
    assistantState: selectedCandidate.assistantState,
    voiceState: context.voiceState || 'idle',
    autopilotAvailable,
    autopilotActive,
    examAvailable,
    cognitiveState,
    quickActions,
    // legacy fields used by the dock UI
    id: `${selectedCandidate.kind || 'assistant'}-${currentPage}`,
    type: legacyType,
    priority: selectedCandidate.priority,
    mobileText,
    mobileExpandedText,
    desktopTitle,
    desktopDetail,
    actionLabel,
    actionPath,
    actionState,
    icon,
    tone,
    message: primaryMessage,
    fullMessage: recommendationReason,
    metadata: {
      ...(selectedCandidate.metadata || {}),
      score: baseState.metadata?.score,
      streak: baseState.metadata?.streak,
      weeklyTrend: baseState.metadata?.weeklyTrend,
      lastActivityDays: baseState.metadata?.lastActivityDays,
      memoryGraph: baseState.metadata?.memoryGraph,
      predictions: baseState.metadata?.predictions,
      dailyPlan: baseState.metadata?.dailyPlan,
      recommendedSession,
      cognitiveLoad,
      cognitiveAdaptation: baseState.metadata?.cognitiveAdaptation,
      autopilotPlan,
      autopilotActive,
      examPlan,
      bestTask,
      currentPage,
      debug: buildDebugTrace({
        assistantState: selectedCandidate.assistantState,
        currentPage,
        autopilotActive,
        examUrgency,
        timerActive,
        cognitiveLoad,
        selectedId: selectedCandidate.kind,
        bestTask
      })
    }
  }

  return snapshot
}

export const getIslandState = getAssistantSnapshot
