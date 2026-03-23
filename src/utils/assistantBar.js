import { generateAssistantState, getBestTask, getShortMessage } from './aiEngine.ts'
import { formatFocusSummary } from './focusTasks.js'

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
  const state = generateAssistantState(
    { personalization },
    { tasks, studySessions, timerState, transientEvent }
  )

  const recommendedTask = getBestTask(tasks, personalization)
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

  const buildTaskRecommendation = (task, tone = 'info') => ({
    id: 'best-task',
    type: 'suggestion',
    priority: Math.max(state.priority, 58),
    mobileText: getShortMessage(task.title || 'Best task', 22),
    mobileExpandedText: getShortMessage(`Start ${task.title || 'task'}`, 24),
    desktopTitle: `Best task: ${task.title || 'Untitled task'}`,
    desktopDetail: `${toSubjectLabel(task.subject)} - ${formatFocusSummary(
      task.totalFocusTime,
      task.sessionsCount
    )}`,
    actionLabel: 'Start Focus',
    actionPath: '/study',
    icon: 'list',
    tone,
    metadata: {
      recommendedTaskId: task.id,
      actionState: { taskId: task.id }
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
        state.type === 'alert' ? 'warning' : 'info'
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
        ...buildTaskRecommendation(recommendedTask, 'neutral'),
        id: 'dashboard-next-focus',
        desktopTitle: `Next focus: ${recommendedTask.title || 'Task'}`,
        desktopDetail: `Best next action is ${toSubjectLabel(
          recommendedTask.subject
        )}. Start one focused block now.`
      }
    }

    return null
  })()

  const resolved = routeSnapshot || state

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
    metadata: resolved.metadata || {}
  }
}

export const getIslandState = getAssistantSnapshot
