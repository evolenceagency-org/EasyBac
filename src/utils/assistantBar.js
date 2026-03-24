import { generateAssistantState, getBestTask, getShortMessage } from './aiEngine.ts'
import { formatFocusSummary } from './focusTasks.js'
import {
  buildAutopilotPlan,
  createAutopilotLaunchPayload,
  readAutopilotState
} from './autopilotEngine.ts'
import { buildExamSimulationPlan } from './examEngine.ts'
import { readCognitiveTelemetry } from './cognitiveLoadEngine.ts'
import { readAiControlCenterSettings } from './aiControlCenter.js'

const toTone = (type, metadata = {}) => {
  if (metadata.tone) return metadata.tone
  if (type === 'timer') return 'active'
  if (type === 'alert') return 'danger'
  if (type === 'insight') return 'info'
  if (type === 'suggestion') return 'success'
  return 'neutral'
}

export const getAssistantSnapshot = ({
  profile,
  tasks = [],
  studySessions = [],
  timerState,
  transientEvent,
  pathname = '/dashboard',
  activeTaskId = null
}) => {
  const personalization = profile?.personalization || profile
  const controlCenterSettings = readAiControlCenterSettings(profile?.id || profile?.userId)
  if (controlCenterSettings.assistant?.visible === false) return null

  const assistantMode = controlCenterSettings.assistant?.mode || 'smart'
  const autopilotState = readAutopilotState(profile?.id || profile?.userId)
  const cognitiveTelemetry = readCognitiveTelemetry(profile?.id || profile?.userId)
  const examPlan = buildExamSimulationPlan(personalization, tasks, {
    studySessions,
    now: new Date(),
    subject: 'auto',
    durationMinutes: null,
    difficulty: 'auto'
  })
  const autopilotPlan = buildAutopilotPlan({
    user: personalization,
    tasks,
    studySessions
  })
  const state = generateAssistantState(
    { personalization },
    { tasks, studySessions, timerState, transientEvent, cognitiveTelemetry, userId: profile?.id || profile?.userId }
  )

  const recommendedTask = getBestTask(tasks, personalization)
  const recommendedSession = state.metadata?.recommendedSession || null
  const activeTask =
    tasks.find((task) => task.id === activeTaskId) ||
    (pathname === '/study' ? recommendedTask : null)

  const toSubjectLabel = (value) => {
    if (!value) return 'task'
    return String(value)
      .split(/[_-]/g)
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(' ')
  }

  const buildTaskRecommendation = (task, tone = 'info', session = null) => ({
    id: 'best-task',
    type: 'suggestion',
    priority: Math.max(state.priority, 58),
    mobileText: getShortMessage(
      session ? `${toSubjectLabel(task.subject)} ${session.duration}m` : task.title || 'Best task',
      22
    ),
    mobileExpandedText: getShortMessage(
      session ? `Start ${toSubjectLabel(task.subject)} ${session.duration}m` : `Start ${task.title || 'task'}`,
      24
    ),
    desktopTitle: session
      ? `Best session: ${toSubjectLabel(task.subject)} ${session.duration}m`
      : `Best task: ${task.title || 'Untitled task'}`,
    desktopDetail: session
      ? session.reason
      : `${toSubjectLabel(task.subject)} - ${formatFocusSummary(
          task.totalFocusTime,
          task.sessionsCount
        )}`,
    actionLabel: 'Start Session',
    actionPath: '/study',
    icon: 'list',
    tone,
    metadata: {
      recommendedTaskId: task.id,
      recommendedSession: session,
      actionState: {
        taskId: task.id,
        ...(session ? { mode: 'pomodoro', duration: session.duration, action: 'start' } : {})
      }
    }
  })

  const buildStudySnapshot = (task) => ({
    id: 'study-task',
    type: timerState?.isRunning ? 'timer' : 'suggestion',
    priority: Math.max(state.priority, timerState?.isRunning ? 100 : 62),
    mobileText: timerState?.isRunning
      ? getShortMessage(`${timerState.formatted} focus`, 20)
      : getShortMessage(task.title || 'Focus task', 20),
    mobileExpandedText: getShortMessage(task.title || 'Focus task', 24),
    desktopTitle: `Working on: ${task.title || 'Untitled task'}`,
    desktopDetail: `${toSubjectLabel(task.subject)} - ${formatFocusSummary(
      task.totalFocusTime,
      task.sessionsCount
    )}`,
    actionLabel: timerState?.isRunning ? 'Resume timer' : 'Open Study',
    actionPath: '/study',
    icon: timerState?.isRunning ? 'timer' : 'list',
    tone: timerState?.isRunning ? 'active' : 'info',
    metadata: {
      actionState: { taskId: task.id }
    }
  })

  const routeSnapshot = (() => {
    if (pathname === '/tasks' && recommendedTask && state.type !== 'timer') {
      return buildTaskRecommendation(
        recommendedTask,
        state.type === 'alert' ? 'warning' : 'info',
        recommendedSession?.taskId === recommendedTask.id ? recommendedSession : null
      )
    }

    if (pathname === '/study' && activeTask) {
      return buildStudySnapshot(activeTask)
    }

    if (pathname === '/analytics') {
      return {
        id: 'analytics-summary',
        type: state.type === 'insight' ? 'insight' : 'suggestion',
        priority: Math.max(state.priority, 40),
        mobileText:
          state.type === 'insight'
            ? getShortMessage(state.message, 20)
            : `Score ${state.metadata?.score ?? '--'}`,
        mobileExpandedText: getShortMessage(state.fullMessage || state.message, 24),
        desktopTitle:
          state.type === 'insight'
            ? state.message
            : `Score ${state.metadata?.score ?? '--'}`,
        desktopDetail:
          state.fullMessage ||
          'Review analytics to see what is improving and what needs correction.',
        actionLabel: 'Open analytics',
        actionPath: '/analytics',
        icon: 'brain',
        tone: 'info',
        metadata: state.metadata || {}
      }
    }

    if (pathname === '/dashboard' && recommendedTask && state.type !== 'timer') {
      return {
        ...buildTaskRecommendation(
          recommendedTask,
          'neutral',
          recommendedSession?.taskId === recommendedTask.id ? recommendedSession : null
        ),
        id: 'dashboard-next-focus',
        desktopTitle:
          recommendedSession?.taskId === recommendedTask.id
            ? `Next focus: ${toSubjectLabel(recommendedTask.subject)} ${recommendedSession.duration}m`
            : `Next focus: ${recommendedTask.title || 'Task'}`,
        desktopDetail:
          recommendedSession?.taskId === recommendedTask.id
            ? recommendedSession.reason
            : `Best next action is ${toSubjectLabel(
                recommendedTask.subject
              )}. Start one focused block now.`
      }
    }

    return null
  })()

  const autopilotSnapshot = (() => {
    if (state.type === 'timer') return null
    if (pathname !== '/dashboard' && pathname !== '/tasks' && pathname !== '/study') {
      return null
    }

    if (!autopilotPlan) return null
    if (assistantMode === 'suggest') return null

    const active = Boolean(autopilotState?.active)
    const actionState = createAutopilotLaunchPayload(autopilotPlan)

    return {
      id: active ? 'autopilot-active' : 'autopilot-ready',
      type: active ? 'timer' : 'suggestion',
      priority: active ? Math.max(state.priority, 72) : Math.max(state.priority, 64),
      mobileText: active
        ? getShortMessage(`Auto ${autopilotPlan.duration}m`, 22)
        : getShortMessage(`Autopilot ${autopilotPlan.duration}m`, 22),
      mobileExpandedText: active
        ? getShortMessage(autopilotState?.reason || autopilotPlan.reason, 26)
        : getShortMessage(autopilotPlan.reason, 26),
      desktopTitle: active
        ? 'Autopilot active'
        : `Start Autopilot: ${autopilotPlan.title}`,
      desktopDetail: active
        ? autopilotState?.reason || autopilotPlan.reason
        : autopilotPlan.reason,
      actionLabel: active ? 'Open Study' : 'Start Autopilot',
      actionPath: '/study',
      icon: active ? 'timer' : 'sparkles',
      tone: active ? 'active' : 'info',
      metadata: {
        actionState: active ? null : actionState,
        autopilotPlan,
        autopilotActive: active
      }
    }
  })()

  const resolved = autopilotSnapshot
    ? autopilotSnapshot
    : routeSnapshot
      ? {
          ...state,
          ...routeSnapshot,
          metadata: {
            ...state.metadata,
            ...routeSnapshot.metadata
          }
        }
      : state

  return {
    id: resolved.id || resolved.type,
    type: resolved.type,
    priority: resolved.priority,
    mobileText: resolved.mobileText || getShortMessage(resolved.message, 22),
    mobileExpandedText: getShortMessage(
      resolved.metadata?.mobileExpandedText ||
        resolved.mobileExpandedText ||
        resolved.fullMessage ||
        resolved.message,
      26
    ),
    desktopTitle: resolved.metadata?.desktopTitle || resolved.desktopTitle || resolved.message,
    desktopDetail: resolved.desktopDetail || resolved.fullMessage,
    actionLabel: resolved.metadata?.actionLabel || resolved.actionLabel || 'Open',
    actionPath: resolved.metadata?.actionPath || resolved.actionPath || '/dashboard',
    actionState: resolved.metadata?.actionState || null,
    icon: resolved.metadata?.icon || resolved.icon || 'sparkles',
    tone: resolved.tone || toTone(resolved.type, resolved.metadata),
    metadata: {
      ...(resolved.metadata || {}),
      examPlan
    }
  }
}

export const getIslandState = getAssistantSnapshot
