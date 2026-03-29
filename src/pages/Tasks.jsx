import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'framer-motion'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Plus,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import useSwipeGesture from '../hooks/useSwipeGesture.js'
import { checkTrialAndBlock } from '../utils/subscriptionGuard.js'
import { isSubscriptionActive } from '../utils/subscription.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 }
}

const SUBJECT_OPTIONS = [
  { value: 'math', label: 'Math' },
  { value: 'physics', label: 'Physics' },
  { value: 'philosophie', label: 'Philosophie' },
  { value: 'svt', label: 'SVT' },
  { value: 'english', label: 'English' },
  { value: 'general', label: 'General' }
]

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
]

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'overdue', label: 'Overdue' }
]

const priorityRank = {
  high: 0,
  medium: 1,
  low: 2
}

const getSubjectLabel = (subject) =>
  SUBJECT_OPTIONS.find((option) => option.value === subject)?.label || 'General'

const getPriorityDotClass = (priority) => {
  if (priority === 'high') return 'bg-[#f97316]'
  if (priority === 'medium') return 'bg-[#8b5cf6]'
  return 'bg-white/40'
}

const getRecommendedDuration = (priority) => {
  if (priority === 'high') return 45
  if (priority === 'medium') return 35
  return 25
}

const formatDateInput = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

const addDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

const getDayKey = (value = new Date()) => {
  const date = new Date(value)
  return date.toISOString().slice(0, 10)
}

const daysUntil = (dueDate) => {
  if (!dueDate) return Number.POSITIVE_INFINITY
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(`${dueDate}T00:00:00`)
  const diff = target.getTime() - startOfToday.getTime()
  return Math.floor(diff / 86400000)
}

const isTaskOverdue = (task) => {
  if (!task?.due_date || task.completed) return false
  return daysUntil(task.due_date) < 0
}

const isTaskToday = (task) => {
  if (!task?.due_date || task.completed) return false
  return daysUntil(task.due_date) === 0
}

const formatDueLabel = (task) => {
  if (!task?.due_date) return 'No due date'
  const diff = daysUntil(task.due_date)
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  if (diff <= 7) return `Due in ${diff}d`
  const date = new Date(`${task.due_date}T00:00:00`)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const getSubjectMinutes = (sessions) => {
  return sessions.reduce((acc, session) => {
    const key = session.subject || 'general'
    const minutes = Number(session.duration_minutes || 0)
    acc[key] = (acc[key] || 0) + minutes
    return acc
  }, {})
}

const getTaskRecommendationScore = (task, subjectMinutes) => {
  const priorityScore =
    task.priority === 'high' ? 42 : task.priority === 'medium' ? 28 : 14

  const dayDiff = daysUntil(task.due_date)
  let dueScore = 6
  if (dayDiff < 0) dueScore = 60
  else if (dayDiff === 0) dueScore = 48
  else if (dayDiff === 1) dueScore = 36
  else if (dayDiff <= 3) dueScore = 24
  else if (dayDiff <= 7) dueScore = 12

  const minutesForSubject = subjectMinutes[task.subject || 'general'] || 0
  const weaknessScore = Math.max(6, 28 - Math.min(minutesForSubject / 12, 20))
  const focusPenalty = Math.min((task.totalFocusTime || 0) / 12, 12)

  return priorityScore + dueScore + weaknessScore - focusPenalty
}

const sortTasksForMobile = (tasks) => {
  return [...tasks].sort((a, b) => {
    const aOverdue = isTaskOverdue(a)
    const bOverdue = isTaskOverdue(b)
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

    const aDays = daysUntil(a.due_date)
    const bDays = daysUntil(b.due_date)
    if (aDays !== bDays) return aDays - bDays

    const priorityDelta = (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99)
    if (priorityDelta !== 0) return priorityDelta

    const aCreated = new Date(a.created_at || 0).getTime()
    const bCreated = new Date(b.created_at || 0).getTime()
    return bCreated - aCreated
  })
}

const getRecommendedTask = (tasks, studySessions) => {
  const activeTasks = tasks.filter((task) => !task.completed)
  if (activeTasks.length === 0) return null

  const subjectMinutes = getSubjectMinutes(studySessions)
  return [...activeTasks]
    .sort((a, b) => getTaskRecommendationScore(b, subjectMinutes) - getTaskRecommendationScore(a, subjectMinutes))[0]
}

const TaskFilterTabs = ({ activeTab, onChange, counts }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {FILTER_TABS.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
              active
                ? 'border-[#8b5cf6]/45 bg-[#8b5cf6]/14 text-white'
                : 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:border-white/[0.12] hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-xs text-white/50">{counts[tab.id] || 0}</span>
          </button>
        )
      })}
    </div>
  )
}

const RecommendedTaskCard = ({ task, onStart }) => {
  if (!task) {
    return (
      <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">AI recommendation</p>
        <p className="mt-3 text-lg font-semibold text-white">Add your first task</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Once you have a few tasks, the assistant will surface the best study target automatically.
        </p>
      </section>
    )
  }

  const suggestedMinutes = getRecommendedDuration(task.priority)

  return (
    <section className="rounded-3xl border border-[#8b5cf6]/18 bg-[#8b5cf6]/[0.08] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[#d8b4fe]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">AI recommendation</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Recommended: Study {getSubjectLabel(task.subject)} - {task.title} ({suggestedMinutes}min)
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Priority, deadline, and your weaker subjects all point here as the smartest next session.
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">{getSubjectLabel(task.subject)}</p>
          <p className={`mt-1 text-xs ${isTaskOverdue(task) ? 'text-red-300' : 'text-white/50'}`}>{formatDueLabel(task)}</p>
        </div>
        <button
          type="button"
          onClick={() => onStart(task)}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#8b5cf6] px-4 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
        >
          Start Focus
        </button>
      </div>
    </section>
  )
}

const TaskRow = ({ task, onComplete, onDelete, onOpen, onReschedule }) => {
  const swipe = useSwipeGesture({
    enabled: !task.completed,
    onComplete: () => onComplete(task),
    onDelete: () => onDelete(task)
  })
  const completeReveal = useTransform(swipe.x, [0, 120], [0, 1])
  const deleteReveal = useTransform(swipe.x, [-120, 0], [1, 0])

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[20px]">
      <motion.div style={{ opacity: completeReveal }} className="pointer-events-none absolute inset-y-0 left-0 flex w-24 items-center justify-center bg-emerald-500/18 text-emerald-200">
        <Check className="h-5 w-5" />
      </motion.div>
      <motion.div style={{ opacity: deleteReveal }} className="pointer-events-none absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-500/18 text-red-200">
        <Trash2 className="h-5 w-5" />
      </motion.div>

      <motion.button
        type="button"
        {...swipe.dragProps}
        whileTap={{ scale: 0.992 }}
        onClick={() => onOpen(task)}
        className="relative flex w-full items-start justify-between gap-4 bg-[#0f1015]/88 px-4 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${getPriorityDotClass(task.priority)}`} />
            <p className="truncate text-[15px] font-semibold text-white">{task.title}</p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            <span>{getSubjectLabel(task.subject)}</span>
            <span className={isTaskOverdue(task) ? 'text-red-300' : ''}>{formatDueLabel(task)}</span>
          </div>
        </div>

        {isTaskOverdue(task) ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              swipe.reset()
              onReschedule(task)
            }}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 px-3 text-xs font-medium text-red-100 transition hover:bg-red-500/14"
          >
            Reschedule
          </button>
        ) : null}
      </motion.button>
    </div>
  )
}

const SheetFrame = ({ open, onClose, title, description, children }) => {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-[71] rounded-t-[28px] border-t border-white/[0.08] bg-[#0b0b0f]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-10px_40px_rgba(0,0,0,0.45)] backdrop-blur-[24px]"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/15" />
            <div className="mx-auto w-full max-w-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{title}</p>
                  {description ? <p className="mt-2 text-sm leading-6 text-white/60">{description}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/70 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5">{children}</div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

const TaskEditorSheet = ({ open, task, mode = 'create', onClose, onSubmit, onDelete, saving }) => {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(task?.title || '')
    setSubject(task?.subject || 'math')
    setDueDate(formatDateInput(task?.due_date || ''))
    setPriority(task?.priority || 'medium')
    setLocalError('')
  }, [open, task])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim()) {
      setLocalError('Add a short task title first.')
      return
    }

    setLocalError('')
    const succeeded = await onSubmit({
      title: title.trim(),
      subject,
      due_date: dueDate || null,
      priority
    })

    if (succeeded) {
      onClose()
    }
  }

  return (
    <SheetFrame
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit task' : 'Add task'}
      description={mode === 'edit' ? 'Update the task and keep the list clean.' : 'Capture the next study action in a few seconds.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-white/45">Title</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Study derivatives"
            className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-[#8b5cf6]/45"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">Subject</label>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-[#8b5cf6]/45"
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-white/45">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none transition focus:border-[#8b5cf6]/45"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-[0.2em] text-white/45">Priority</label>
          <div className="grid grid-cols-3 gap-2">
            {PRIORITY_OPTIONS.map((option) => {
              const active = option.value === priority
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPriority(option.value)}
                  className={`min-h-11 rounded-2xl border text-sm font-medium transition ${
                    active
                      ? 'border-[#8b5cf6]/45 bg-[#8b5cf6]/14 text-white'
                      : 'border-white/[0.08] bg-white/[0.03] text-white/65 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        {localError ? <p className="text-sm text-red-300">{localError}</p> : null}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#8b5cf6] px-4 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:opacity-60"
          >
            {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Add task'}
          </button>
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={async () => {
                const succeeded = await onDelete()
                if (succeeded) onClose()
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 px-4 text-sm font-medium text-red-100 transition hover:bg-red-500/14"
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </SheetFrame>
  )
}

const RescheduleSheet = ({ task, open, onClose, onChoose, saving }) => {
  const [customDate, setCustomDate] = useState('')

  useEffect(() => {
    if (open) setCustomDate(formatDateInput(task?.due_date || ''))
  }, [open, task])

  const runChoice = async (dateValue) => {
    const succeeded = await onChoose(dateValue)
    if (succeeded) onClose()
  }

  return (
    <SheetFrame
      open={open}
      onClose={onClose}
      title="Reschedule task"
      description={task ? `Move ${task.title} to a better date without losing it.` : ''}
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => runChoice(addDays(1))}
          disabled={saving}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white transition hover:border-white/[0.14]"
        >
          <span>Tomorrow</span>
          <span className="text-white/45">{addDays(1)}</span>
        </button>
        <button
          type="button"
          onClick={() => runChoice(addDays(3))}
          disabled={saving}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white transition hover:border-white/[0.14]"
        >
          <span>+3 days</span>
          <span className="text-white/45">{addDays(3)}</span>
        </button>

        <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4">
          <label className="text-xs uppercase tracking-[0.2em] text-white/45">Pick date</label>
          <input
            type="date"
            value={customDate}
            onChange={(event) => setCustomDate(event.target.value)}
            className="mt-3 h-12 w-full rounded-2xl border border-white/[0.08] bg-[#0b0b0f] px-4 text-sm text-white outline-none transition focus:border-[#8b5cf6]/45"
          />
          <button
            type="button"
            onClick={() => runChoice(customDate)}
            disabled={!customDate || saving}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#8b5cf6] px-4 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:opacity-60"
          >
            Apply date
          </button>
        </div>
      </div>
    </SheetFrame>
  )
}

const Tasks = () => {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const {
    tasks,
    studySessions,
    loading,
    errors,
    addTask,
    toggleTask,
    removeTask,
    updateTaskById
  } = useData()

  const subscriptionActive = useMemo(() => isSubscriptionActive(profile), [profile])
  const [activeTab, setActiveTab] = useState('all')
  const [editorState, setEditorState] = useState({ open: false, mode: 'create', task: null })
  const [rescheduleTask, setRescheduleTask] = useState(null)
  const [savingTask, setSavingTask] = useState(false)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  )

  const recommendedTask = useMemo(
    () => getRecommendedTask(activeTasks, studySessions),
    [activeTasks, studySessions]
  )

  const filteredTasks = useMemo(() => {
    const base = activeTasks.filter((task) => {
      if (activeTab === 'today') return isTaskToday(task)
      if (activeTab === 'overdue') return isTaskOverdue(task)
      return true
    })

    return sortTasksForMobile(base).slice(0, 7)
  }, [activeTab, activeTasks])

  const tabCounts = useMemo(
    () => ({
      all: activeTasks.length,
      today: activeTasks.filter((task) => isTaskToday(task)).length,
      overdue: activeTasks.filter((task) => isTaskOverdue(task)).length
    }),
    [activeTasks]
  )

  const handleGuard = useCallback(() => checkTrialAndBlock(profile, navigate), [navigate, profile])

  const handleOpenCreate = useCallback(() => {
    if (!handleGuard()) return
    setEditorState({ open: true, mode: 'create', task: null })
  }, [handleGuard])

  const handleOpenEdit = useCallback(
    (task) => {
      if (!handleGuard()) return
      setEditorState({ open: true, mode: 'edit', task })
    },
    [handleGuard]
  )

  const handleStartFocus = useCallback(
    (task) => {
      if (!handleGuard()) return
      navigate('/study', { state: { suggestedTaskId: task.id } })
    },
    [handleGuard, navigate]
  )

  const handleSaveTask = useCallback(
    async (payload) => {
      if (!handleGuard()) return false
      setSavingTask(true)
      setPageError('')
      setNotice('')

      try {
        if (editorState.mode === 'edit' && editorState.task) {
          await updateTaskById(editorState.task.id, payload)
          setNotice('Task updated.')
        } else {
          await addTask(payload)
          setNotice('Task added.')
        }
        return true
      } catch (error) {
        setPageError('We could not save that task. Please try again.')
        return false
      } finally {
        setSavingTask(false)
      }
    },
    [addTask, editorState.mode, editorState.task, handleGuard, updateTaskById]
  )

  const handleDeleteTask = useCallback(
    async (task) => {
      if (!handleGuard()) return false
      setPageError('')
      setNotice('')

      try {
        await removeTask(task.id)
        setNotice('Task deleted.')
        return true
      } catch {
        setPageError('We could not delete that task. Please try again.')
        return false
      }
    },
    [handleGuard, removeTask]
  )

  const handleCompleteTask = useCallback(
    async (task) => {
      if (!handleGuard()) return false
      setPageError('')
      setNotice('')

      try {
        await toggleTask(task.id, task.completed)
        setNotice('Task completed.')
        return true
      } catch {
        setPageError('We could not complete that task. Please try again.')
        return false
      }
    },
    [handleGuard, toggleTask]
  )

  const handleReschedule = useCallback(
    async (task, dateValue) => {
      if (!handleGuard()) return false
      if (!dateValue) return false
      setPageError('')
      setNotice('')

      try {
        await updateTaskById(task.id, {
          due_date: dateValue,
          completed: false,
          status: 'active'
        })
        setNotice('Task rescheduled.')
        return true
      } catch {
        setPageError('We could not reschedule that task. Please try again.')
        return false
      }
    },
    [handleGuard, updateTaskById]
  )

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 md:px-6 md:py-6"
    >
      <RecommendedTaskCard task={recommendedTask} onStart={handleStartFocus} />

      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-[20px]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Tasks</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Keep the next 5 to 7 actions visible</h2>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="hidden min-h-11 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-medium text-white transition hover:border-[#8b5cf6]/35 hover:text-white md:inline-flex"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add task
          </button>
        </div>

        <div className="mt-4">
          <TaskFilterTabs activeTab={activeTab} onChange={setActiveTab} counts={tabCounts} />
        </div>
      </section>

      {!subscriptionActive ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Your premium access is inactive. Upgrade to keep managing tasks and launching focus sessions.
        </div>
      ) : null}

      {pageError || errors.tasks ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {pageError || errors.tasks}
        </div>
      ) : null}

      <AnimatePresence>
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {notice}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="space-y-3">
        {loading.tasks ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-[84px] animate-pulse rounded-3xl border border-white/[0.08] bg-white/[0.03]" />
          ))
        ) : filteredTasks.length > 0 ? (
          filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={handleCompleteTask}
              onDelete={handleDeleteTask}
              onOpen={handleOpenEdit}
              onReschedule={setRescheduleTask}
            />
          ))
        ) : (
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 text-center backdrop-blur-[20px]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] text-white/60">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-white">Nothing blocking you right now</h3>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Add the next study action or switch tabs to review what is due today or overdue.
            </p>
          </section>
        )}
      </section>

      <TaskEditorSheet
        open={editorState.open}
        mode={editorState.mode}
        task={editorState.task}
        onClose={() => setEditorState({ open: false, mode: 'create', task: null })}
        onSubmit={handleSaveTask}
        onDelete={async () => {
          if (!editorState.task) return false
          return handleDeleteTask(editorState.task)
        }}
        saving={savingTask}
      />

      <RescheduleSheet
        open={Boolean(rescheduleTask)}
        task={rescheduleTask}
        onClose={() => setRescheduleTask(null)}
        onChoose={(dateValue) => handleReschedule(rescheduleTask, dateValue)}
        saving={savingTask}
      />

      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={handleOpenCreate}
        className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#8b5cf6] text-white shadow-[0_12px_30px_rgba(139,92,246,0.35)] transition hover:bg-[#7c3aed] md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" />
      </motion.button>
    </motion.div>
  )
}

export default Tasks
