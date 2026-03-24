import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, ListTodo, Plus, Search } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { toDateKey } from '../utils/dateUtils.js'
import { getBestTask } from '../utils/aiEngine.ts'
import { isSubscriptionActive } from '../utils/subscription.js'
import { checkTrialAndBlock } from '../utils/subscriptionGuard.js'
import {
  getTasksCompletedToday,
  getTasksDueToday,
  isOverdueTask
} from '../utils/taskStats.js'
import { formatFocusSummary } from '../utils/focusTasks.js'
import TaskCard from '../components/Tasks/TaskCard.jsx'
import GlassDropdown from '../components/Tasks/GlassDropdown.jsx'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const subjects = [
  { label: 'All', value: 'all' },
  { label: 'Math', value: 'math', color: 'bg-blue-500/20 text-blue-200' },
  { label: 'Physics', value: 'physics', color: 'bg-purple-500/20 text-purple-200' },
  { label: 'Philosophie', value: 'philosophie', color: 'bg-amber-400/20 text-amber-200' },
  { label: 'SVT', value: 'svt', color: 'bg-emerald-500/20 text-emerald-200' },
  { label: 'English', value: 'english', color: 'bg-pink-500/20 text-pink-200' }
]

const subjectColorMap = subjects.reduce((acc, subject) => {
  if (subject.value !== 'all') {
    acc[subject.value] = subject.color
  }
  return acc
}, {})

const getSubjectLabel = (value) =>
  subjects.find((item) => item.value === value)?.label || value

const getTaskStatus = (task) => {
  if (task.status) return task.status
  return task.completed ? 'completed' : 'active'
}

const getTaskDotClass = (task) => {
  const overdue = isOverdueTask(task)
  if (task.completed) return 'bg-emerald-400'
  if (task.status === 'on_hold') return 'bg-slate-300'
  if (overdue) return 'bg-rose-400'
  return 'bg-blue-400'
}

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const buildCalendarDays = (monthDate) => {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const weekdayIndex = (firstOfMonth.getDay() + 6) % 7
  const startDate = new Date(firstOfMonth)
  startDate.setDate(firstOfMonth.getDate() - weekdayIndex)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
      isToday: toDateKey(date) === toDateKey(new Date())
    }
  })
}

const FILTER_DEFAULTS = {
  subject: 'all',
  status: 'all',
  due: 'all',
  sort: 'newest',
  search: ''
}

const sortLabels = {
  newest: 'Newest',
  oldest: 'Oldest',
  'due-nearest': 'Due nearest',
  'due-latest': 'Due latest',
  subject: 'Subject A-Z'
}

const Tasks = () => {
  const { profile } = useAuth()
  const {
    tasks,
    loading,
    errors,
    addTask,
    toggleTask,
    removeTask,
    updateTaskById
  } = useData()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [subjectFilter, setSubjectFilter] = useState(FILTER_DEFAULTS.subject)
  const [statusFilter, setStatusFilter] = useState(FILTER_DEFAULTS.status)
  const [dueFilter, setDueFilter] = useState(FILTER_DEFAULTS.due)
  const [sortOption, setSortOption] = useState(FILTER_DEFAULTS.sort)

  const [showSwipeHint, setShowSwipeHint] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  const [showSwipeNudge, setShowSwipeNudge] = useState(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return false
    return window.localStorage.getItem('tasks-swipe-nudge-done') !== '1'
  })
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [searchTerm, setSearchTerm] = useState(FILTER_DEFAULTS.search)
  const [viewMode, setViewMode] = useState('list')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [draggingTaskId, setDraggingTaskId] = useState(null)
  const [dragOverDayKey, setDragOverDayKey] = useState(null)
  const [showCalendarCreateSheet, setShowCalendarCreateSheet] = useState(false)
  const [activePressDayKey, setActivePressDayKey] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [recentCommands, setRecentCommands] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const parsed = JSON.parse(window.localStorage.getItem('tasks-recent-commands') || '[]')
      return Array.isArray(parsed) ? parsed.slice(0, 5) : []
    } catch {
      return []
    }
  })
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const paletteInputRef = useRef(null)
  const taskCardRefs = useRef({})
  const lastScrolledTaskRef = useRef(null)

  const todayKey = useMemo(() => toDateKey(new Date()), [])
  const subscriptionActive = useMemo(
    () => isSubscriptionActive(profile),
    [profile]
  )

  const lockActions = !subscriptionActive
  const showExpired = Boolean(profile) && !subscriptionActive

  useEffect(() => {
    if (!showSwipeHint) return
    const timer = setTimeout(() => setShowSwipeHint(false), 3000)
    return () => clearTimeout(timer)
  }, [showSwipeHint])

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault()
      if (!title.trim()) return false
      if (!checkTrialAndBlock(profile, navigate)) return false

      setSaving(true)
      setError('')
      try {
        await addTask({
          title: title.trim(),
          subject,
          due_date: dueDate || null
        })
        setTitle('')
        setDueDate('')

        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setShowCreatePanel(false)
        }
        return true
      } catch (err) {
        setError('Unable to create the task. Please try again.')
        return false
      } finally {
        setSaving(false)
      }
    },
    [title, subject, dueDate, addTask, profile, navigate]
  )

  const handleToggle = useCallback(
    async (taskId, currentCompleted) => {
      if (!checkTrialAndBlock(profile, navigate)) return
      setError('')
      try {
        await toggleTask(taskId, currentCompleted)
      } catch (err) {
        setError('Unable to update the task status.')
      }
    },
    [toggleTask, profile, navigate]
  )

  const handleDelete = useCallback(
    async (taskId) => {
      if (!checkTrialAndBlock(profile, navigate)) return
      setError('')
      try {
        await removeTask(taskId)
      } catch (err) {
        setError('Unable to delete the task.')
      }
    },
    [removeTask, profile, navigate]
  )

  const handleReschedule = useCallback(
    async (taskId, newDate) => {
      if (!newDate) return
      const formattedDate = new Date(newDate).toISOString().split('T')[0]
      if (!checkTrialAndBlock(profile, navigate)) return
      setError('')
      try {
        await updateTaskById(taskId, {
          due_date: formattedDate,
          status: 'active',
          completed: false
        })
      } catch (err) {
        setError('Unable to reschedule the task.')
      }
    },
    [updateTaskById, profile, navigate]
  )

  const handleStartFocus = useCallback(
    (task) => {
      if (!checkTrialAndBlock(profile, navigate)) return
      navigate('/study', {
        state: {
          taskId: task.id
        }
      })
    },
    [navigate, profile]
  )

  const handleToggleHold = useCallback(
    async (task) => {
      if (!checkTrialAndBlock(profile, navigate)) return
      setError('')
      try {
        await updateTaskById(task.id, {
          status: task.status === 'on_hold' ? 'active' : 'on_hold',
          completed: false
        })
      } catch (err) {
        setError('Unable to update the task state.')
      }
    },
    [navigate, profile, updateTaskById]
  )

  const resetFilters = useCallback(() => {
    setSubjectFilter(FILTER_DEFAULTS.subject)
    setStatusFilter(FILTER_DEFAULTS.status)
    setDueFilter(FILTER_DEFAULTS.due)
    setSortOption(FILTER_DEFAULTS.sort)
    setSearchTerm(FILTER_DEFAULTS.search)
  }, [])

  const executeCommand = useCallback((command) => {
    command.run()
    setPaletteOpen(false)
    setPaletteQuery('')
    setSelectedCommandIndex(0)
    setRecentCommands((prev) => {
      const next = [command.title, ...prev.filter((item) => item !== command.title)].slice(0, 5)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tasks-recent-commands', JSON.stringify(next))
      }
      return next
    })
  }, [])

  const commandItems = useMemo(
    () => [
      { id: 'filter-all', title: 'Filter: All subjects', group: 'Filters', run: () => setSubjectFilter('all') },
      { id: 'filter-math', title: 'Filter: Math', group: 'Filters', run: () => setSubjectFilter('math') },
      { id: 'filter-physics', title: 'Filter: Physics', group: 'Filters', run: () => setSubjectFilter('physics') },
      { id: 'filter-svt', title: 'Filter: SVT', group: 'Filters', run: () => setSubjectFilter('svt') },
      { id: 'filter-english', title: 'Filter: English', group: 'Filters', run: () => setSubjectFilter('english') },
      { id: 'filter-status-all', title: 'Filter: All statuses', group: 'Filters', run: () => setStatusFilter('all') },
      { id: 'filter-completed', title: 'Filter: Completed', group: 'Filters', run: () => setStatusFilter('completed') },
      { id: 'filter-pending', title: 'Filter: Pending', group: 'Filters', run: () => setStatusFilter('pending') },
      { id: 'filter-overdue', title: 'Filter: Overdue', group: 'Filters', run: () => setStatusFilter('overdue') },
      { id: 'filter-due-all', title: 'Filter: Due all', group: 'Filters', run: () => setDueFilter('all') },
      { id: 'filter-due-today', title: 'Filter: Due today', group: 'Filters', run: () => setDueFilter('today') },
      { id: 'filter-due-overdue', title: 'Filter: Due overdue', group: 'Filters', run: () => setDueFilter('overdue') },
      { id: 'filter-due-unscheduled', title: 'Filter: Unscheduled', group: 'Filters', run: () => setDueFilter('unscheduled') },
      { id: 'sort-newest', title: 'Sort: Newest first', group: 'Filters', run: () => setSortOption('newest') },
      { id: 'sort-oldest', title: 'Sort: Oldest first', group: 'Filters', run: () => setSortOption('oldest') },
      { id: 'sort-due-nearest', title: 'Sort: Due nearest', group: 'Filters', run: () => setSortOption('due-nearest') },
      { id: 'sort-due-latest', title: 'Sort: Due latest', group: 'Filters', run: () => setSortOption('due-latest') },
      { id: 'sort-subject', title: 'Sort: Subject A-Z', group: 'Filters', run: () => setSortOption('subject') },
      { id: 'filter-clear', title: 'Clear all filters', group: 'Filters', run: () => {
        resetFilters()
      } },
      { id: 'view-list', title: 'View List', group: 'Actions', run: () => setViewMode('list') },
      { id: 'view-calendar', title: 'View Calendar', group: 'Actions', run: () => setViewMode('calendar') },
      { id: 'create-task', title: 'Create Task', group: 'Actions', run: () => setShowCreatePanel(true) },
      { id: 'go-dashboard', title: 'Go to Dashboard', group: 'Navigation', run: () => navigate('/dashboard') },
      { id: 'go-tasks', title: 'Go to Tasks', group: 'Navigation', run: () => navigate('/tasks') }
    ],
    [navigate, resetFilters]
  )

  const visibleCommands = useMemo(() => {
    if (!paletteQuery.trim()) {
      const recent = recentCommands
        .map((title) => commandItems.find((command) => command.title === title))
        .filter(Boolean)
      const suggestions = commandItems.filter((command) => !recent.some((item) => item.id === command.id)).slice(0, 7)
      return [...recent, ...suggestions]
    }

    const query = paletteQuery.toLowerCase()
    const matching = commandItems.filter((command) => command.title.toLowerCase().includes(query))
    const searchCommand = {
      id: `search-${query}`,
      title: `Search tasks: "${paletteQuery}"`,
      group: 'Search',
      run: () => setSearchTerm(paletteQuery.trim())
    }
    return [searchCommand, ...matching]
  }, [commandItems, paletteQuery, recentCommands])

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    const getCreatedTime = (task) => {
      const createdAt = task.created_at ? new Date(task.created_at).getTime() : 0
      return Number.isFinite(createdAt) ? createdAt : 0
    }

    const getDueTime = (task, fallback) => {
      if (!task.due_date) return fallback
      const dueAt = new Date(`${task.due_date}T00:00:00`).getTime()
      return Number.isFinite(dueAt) ? dueAt : fallback
    }

    const result = tasks
      .filter((task) => getTaskStatus(task) !== 'archived_overdue')
      .filter((task) => subjectFilter === 'all' || task.subject === subjectFilter)
      .filter((task) => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'completed') return getTaskStatus(task) === 'completed'
        if (statusFilter === 'pending') {
          return getTaskStatus(task) === 'active' && !isOverdueTask(task)
        }
        if (statusFilter === 'overdue') {
          return getTaskStatus(task) !== 'completed' && isOverdueTask(task)
        }
        return true
      })
      .filter((task) => {
        if (dueFilter === 'all') return true
        if (dueFilter === 'today') return task.due_date === todayKey
        if (dueFilter === 'overdue') {
          return getTaskStatus(task) !== 'completed' && isOverdueTask(task)
        }
        if (dueFilter === 'unscheduled') return !task.due_date
        return true
      })
      .filter((task) => {
        if (!query) return true
        const titleText = (task.title || '').toLowerCase()
        const subjectText = (task.subject || '').toLowerCase()
        const subjectLabelText = getSubjectLabel(task.subject || '').toLowerCase()
        const dueText = (task.due_date || '').toLowerCase()
        return (
          titleText.includes(query) ||
          subjectText.includes(query) ||
          subjectLabelText.includes(query) ||
          dueText.includes(query)
        )
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'oldest':
            return getCreatedTime(a) - getCreatedTime(b)
          case 'due-nearest':
            return getDueTime(a, Number.POSITIVE_INFINITY) - getDueTime(b, Number.POSITIVE_INFINITY)
          case 'due-latest':
            return getDueTime(b, Number.NEGATIVE_INFINITY) - getDueTime(a, Number.NEGATIVE_INFINITY)
          case 'subject':
            return (a.subject || '').localeCompare(b.subject || '')
          case 'newest':
          default:
            return getCreatedTime(b) - getCreatedTime(a)
        }
      })

    return result
  }, [tasks, subjectFilter, statusFilter, dueFilter, sortOption, todayKey, searchTerm])

  const recommendedTask = useMemo(() => {
    const taskPool = filteredTasks.length > 0 ? filteredTasks : tasks
    return getBestTask(taskPool, profile?.personalization || profile)
  }, [filteredTasks, tasks, profile])

  const recommendedTaskId = recommendedTask?.id || null

  const tasksByDate = useMemo(() => {
    const map = {}
    filteredTasks.forEach((task) => {
      if (!task.due_date) return
      if (!map[task.due_date]) {
        map[task.due_date] = []
      }
      map[task.due_date].push(task)
    })
    return map
  }, [filteredTasks])

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth),
    [calendarMonth]
  )
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'long',
        year: 'numeric'
      }).format(calendarMonth),
    [calendarMonth]
  )

  const selectedKey = selectedDate ? toDateKey(selectedDate) : null
  const selectedTasks = selectedKey ? tasksByDate[selectedKey] || [] : []

  const getDayKeyFromPoint = useCallback((x, y) => {
    if (typeof document === 'undefined') return null
    const element = document.elementFromPoint(x, y)
    return element?.closest?.('[data-day-key]')?.getAttribute('data-day-key') || null
  }, [])

  const openCalendarCreate = useCallback((dateKey) => {
    setDueDate(dateKey)
    setShowCalendarCreateSheet(true)
  }, [])

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleDayPointerDown = useCallback((dayKey) => {
    setActivePressDayKey(dayKey)
    longPressTriggeredRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setActivePressDayKey(null)
      openCalendarCreate(dayKey)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(16)
      }
    }, 500)
  }, [clearLongPressTimer, openCalendarCreate])

  const handleDayPointerUp = useCallback(() => {
    clearLongPressTimer()
    setActivePressDayKey(null)
  }, [clearLongPressTimer])

  const handleCalendarTaskDragStart = useCallback((taskId) => {
    setDraggingTaskId(taskId)
  }, [])

  const handleCalendarTaskDrag = useCallback((_, info) => {
    if (!draggingTaskId) return
    const targetKey = getDayKeyFromPoint(info.point.x, info.point.y)
    setDragOverDayKey(targetKey)
  }, [draggingTaskId, getDayKeyFromPoint])

  const handleCalendarTaskDragEnd = useCallback(async (task, _, info) => {
    const targetKey = getDayKeyFromPoint(info.point.x, info.point.y)
    setDraggingTaskId(null)
    setDragOverDayKey(null)
    if (!targetKey || targetKey === task.due_date) return
    await handleReschedule(task.id, targetKey)
  }, [getDayKeyFromPoint, handleReschedule])

  const shouldRunSwipeNudge =
    viewMode === 'list' && showSwipeNudge && !loading.tasks && filteredTasks.length > 0

  useEffect(() => {
    if (!shouldRunSwipeNudge) return
    const timer = setTimeout(() => {
      setShowSwipeNudge(false)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('tasks-swipe-nudge-done', '1')
      }
    }, 1800)
    return () => clearTimeout(timer)
  }, [shouldRunSwipeNudge])

  useEffect(() => {
    if (viewMode === 'list') {
      setSelectedDate(null)
      setDragOverDayKey(null)
      setDraggingTaskId(null)
      setShowCalendarCreateSheet(false)
    }
  }, [viewMode])

  useEffect(() => {
    return () => clearLongPressTimer()
  }, [clearLongPressTimer])

  useEffect(() => {
    const shouldLockScroll = Boolean(selectedDate || showCalendarCreateSheet || paletteOpen)
    const previousOverflow = document.body.style.overflow
    if (shouldLockScroll) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = previousOverflow || 'auto'
    }
  }, [selectedDate, showCalendarCreateSheet, paletteOpen])

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((prev) => !prev)
      }

      if (event.key === 'Escape') {
        setPaletteOpen(false)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!paletteOpen) return
    const timer = setTimeout(() => {
      paletteInputRef.current?.focus()
    }, 40)
    return () => clearTimeout(timer)
  }, [paletteOpen])

  useEffect(() => {
    setSelectedCommandIndex(0)
  }, [paletteQuery])

  useEffect(() => {
    if (viewMode !== 'list' || !recommendedTaskId || loading.tasks) return
    if (lastScrolledTaskRef.current === recommendedTaskId) return

    const frame = window.requestAnimationFrame(() => {
      const node = taskCardRefs.current[recommendedTaskId]
      if (node) {
        node.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
        lastScrolledTaskRef.current = recommendedTaskId
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [recommendedTaskId, viewMode, loading.tasks])

  useEffect(() => {
    if (!paletteOpen) return
    const handleKeys = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedCommandIndex((prev) =>
          Math.min(prev + 1, Math.max(visibleCommands.length - 1, 0))
        )
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedCommandIndex((prev) => Math.max(prev - 1, 0))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const selected = visibleCommands[selectedCommandIndex]
        if (selected) {
          executeCommand(selected)
        }
      }
    }

    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [executeCommand, paletteOpen, selectedCommandIndex, visibleCommands])

  const tasksDueToday = useMemo(() => getTasksDueToday(tasks), [tasks])
  const completedToday = useMemo(() => getTasksCompletedToday(tasks), [tasks])
  const progressTotal = tasksDueToday.length
  const progressDone = tasksDueToday.filter((task) => task.completed).length
  const progressPercent =
    progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100)

  const renderCreateTaskForm = ({ compact = false, onCreated } = {}) => (
    <form
      onSubmit={async (event) => {
        const created = await handleCreate(event)
        if (created && onCreated) onCreated()
      }}
      className={`mt-4 grid gap-3 ${
        compact
          ? 'md:grid-cols-1'
          : 'md:mt-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:gap-4'
      }`}
    >
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Task title"
        disabled={lockActions}
        className="w-full box-border rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/50 backdrop-blur-md transition-all duration-300 ease-out focus:border-purple-400/40 focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <GlassDropdown
        value={subject}
        onChange={setSubject}
        disabled={lockActions}
        options={subjects.filter((item) => item.value !== 'all')}
      />
      <input
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        disabled={lockActions}
        className="w-full box-border rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 backdrop-blur-md transition-all duration-300 ease-out focus:border-purple-400/40 focus:shadow-[0_0_10px_rgba(139,92,246,0.2)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      <motion.button
        type="submit"
        disabled={saving || lockActions}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60 md:justify-self-end"
      >
        {saving ? 'Saving...' : 'Add Task'}
      </motion.button>
    </form>
  )

  const calendarView = (
    <div className="glass overflow-visible rounded-2xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">Calendar</p>
          <h3 className="mt-1 text-lg font-semibold text-white md:text-xl">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-white/50">
        Drag a task chip to another day. Long press any day to quick-create a task.
      </p>

      <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-white/50">
        {weekDays.map((day) => (
          <span key={day} className="text-center uppercase tracking-wide">
            {day}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mt-2 grid grid-cols-7 gap-2"
        >
          {calendarDays.map((day) => {
            const dayTasks = tasksByDate[day.key] || []
            const visibleTasks = dayTasks.slice(0, 3)
            const extraCount = dayTasks.length - visibleTasks.length
            const isSelected = selectedKey === day.key
            const isDragTarget = draggingTaskId && dragOverDayKey === day.key
            const isPressing = activePressDayKey === day.key

            return (
              <motion.button
                key={day.key}
                type="button"
                data-day-key={day.key}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false
                    return
                  }
                  setSelectedDate(day.date)
                }}
                onPointerDown={() => handleDayPointerDown(day.key)}
                onPointerUp={handleDayPointerUp}
                onPointerCancel={handleDayPointerUp}
                onPointerLeave={handleDayPointerUp}
                className={`group relative flex min-h-[96px] w-full flex-col items-start justify-between rounded-xl border px-2 py-2 text-left transition ${
                  day.inMonth ? 'bg-white/5 text-white/80' : 'bg-white/2 text-white/30'
                } ${
                  day.isToday
                    ? 'border-cyan-400/40 shadow-[0_0_18px_rgba(34,211,238,0.25)]'
                    : 'border-white/10'
                } ${
                  isSelected ? 'ring-1 ring-purple-400/40' : ''
                } ${
                  isDragTarget ? 'bg-white/10 ring-1 ring-cyan-400/60' : ''
                }`}
              >
                <motion.span
                  initial={false}
                  animate={{ scale: isPressing ? 0.94 : 1 }}
                  className={`text-xs font-semibold ${day.inMonth ? 'text-white' : 'text-white/40'}`}
                >
                  {day.date.getDate()}
                </motion.span>

                <AnimatePresence>
                  {isPressing && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 rounded-xl bg-cyan-400/10"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.04 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    openCalendarCreate(day.key)
                  }}
                  className="absolute right-1 top-1 rounded-md border border-white/10 bg-white/5 p-1 text-white/60 opacity-0 transition group-hover:opacity-100 md:opacity-0"
                >
                  <Plus className="h-3 w-3" />
                </button>

                <div className="mt-2 flex w-full flex-col gap-1">
                  <AnimatePresence>
                    {visibleTasks.map((task) => (
                      <motion.div
                        key={`${task.id}-${day.key}`}
                        drag
                        dragMomentum={false}
                        dragElastic={0.18}
                        dragTransition={{ bounceStiffness: 380, bounceDamping: 28 }}
                        onDragStart={() => handleCalendarTaskDragStart(task.id)}
                        onDrag={handleCalendarTaskDrag}
                        onDragEnd={(event, info) => handleCalendarTaskDragEnd(task, event, info)}
                        whileDrag={{
                          scale: 1.05,
                          boxShadow: '0 16px 32px rgba(0,0,0,0.45)',
                          zIndex: 60
                        }}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/80"
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${getTaskDotClass(task)}`} />
                        <span className="truncate">{task.title}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {extraCount > 0 && (
                    <span className="text-[10px] text-white/50">+{extraCount} more</span>
                  )}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )

  const selectedDayTaskList = (
    <div className="grid gap-3">
      {selectedTasks.map((task) => (
        <motion.div
          key={`${task.id}-daylist`}
          drag
          dragMomentum={false}
          dragElastic={0.15}
          dragTransition={{ bounceStiffness: 360, bounceDamping: 26 }}
          whileDrag={{
            scale: 1.03,
            boxShadow: '0 16px 30px rgba(0,0,0,0.45)',
            zIndex: 60
          }}
          onDragStart={() => handleCalendarTaskDragStart(task.id)}
          onDrag={handleCalendarTaskDrag}
          onDragEnd={(event, info) => handleCalendarTaskDragEnd(task, event, info)}
          className="cursor-grab active:cursor-grabbing"
        >
          <TaskCard
            task={task}
            subjectColorMap={subjectColorMap}
            getSubjectLabel={getSubjectLabel}
            isOverdue={isOverdueTask(task)}
            isDueToday={task.due_date === todayKey}
            isRecommended={task.id === recommendedTaskId}
            showSwipeNudge={false}
            lockActions={lockActions}
            disableSwipe
            onToggle={handleToggle}
            onDelete={handleDelete}
            onToggleHold={handleToggleHold}
            onReschedule={handleReschedule}
            onStartFocus={handleStartFocus}
            focusSummary={formatFocusSummary(task.totalFocusTime, task.sessionsCount)}
          />
        </motion.div>
      ))}
    </div>
  )

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="w-full max-w-full overflow-x-hidden box-border px-4 md:px-6"
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 md:gap-6">
      <div className="glass overflow-visible rounded-2xl p-4 md:p-6">
        <p className="text-xs uppercase tracking-wide text-white/70">
          Task Productivity
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">Today's Task Progress</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>
              {progressDone} / {progressTotal} tasks completed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressTotal === 0 && (
            <p className="mt-2 text-xs text-white/60">
              No tasks due today. You're clear.
            </p>
          )}
        </div>
      </div>

      {showExpired && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
          Trial expired. Upgrade to continue.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-xs text-white/70">
          {[
            { label: 'List', value: 'list', icon: ListTodo },
            { label: 'Calendar', value: 'calendar', icon: CalendarDays }
          ].map((tab) => {
            const active = viewMode === tab.value
            const Icon = tab.icon
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setViewMode(tab.value)}
                className="relative flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium"
              >
                {active && (
                  <motion.span
                    layoutId="tasksViewToggle"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 to-blue-500/30"
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {viewMode === 'calendar' && (
          <p className="text-xs text-white/50">
            Tap a day to view tasks and actions
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
          {searchTerm ? (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
              Search: {searchTerm}
            </span>
          ) : null}
          {subjectFilter !== 'all' ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Subject: {getSubjectLabel(subjectFilter)}
            </span>
          ) : null}
          {statusFilter !== FILTER_DEFAULTS.status ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Status: {statusFilter}
            </span>
          ) : null}
          {dueFilter !== FILTER_DEFAULTS.due ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Due: {dueFilter}
            </span>
          ) : null}
          {sortOption !== FILTER_DEFAULTS.sort ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Sort: {sortLabels[sortOption] || sortOption}
            </span>
          ) : null}
          {(searchTerm ||
            subjectFilter !== FILTER_DEFAULTS.subject ||
            statusFilter !== FILTER_DEFAULTS.status ||
            dueFilter !== FILTER_DEFAULTS.due ||
            sortOption !== FILTER_DEFAULTS.sort) && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/80 transition hover:border-cyan-300/50 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:border-white/20 hover:bg-white/10 md:inline-flex"
        >
          <Search className="h-3.5 w-3.5" />
          Command Palette
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/60">
            Ctrl/Cmd + K
          </span>
        </button>
      </div>

      <div className="grid gap-3 md:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setShowCreatePanel((prev) => !prev)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur-xl"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </motion.button>
      </div>

      <AnimatePresence>
        {showCreatePanel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass overflow-visible rounded-2xl p-4 md:hidden"
          >
            <div className="mx-auto w-full max-w-full">
              <p className="text-xs uppercase tracking-wide text-white/70">
                Create Task
              </p>
              {renderCreateTaskForm()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden glass overflow-visible rounded-2xl p-4 md:block md:p-6">
        <div className="mx-auto w-full max-w-4xl">
          <p className="text-xs uppercase tracking-wide text-white/70">
            Create Task
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">Plan your next moves</h3>
          {renderCreateTaskForm()}
          {(error || errors.tasks) && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error || errors.tasks}
            </p>
          )}
        </div>
      </div>

      {(error || errors.tasks) && (
        <p className="md:hidden rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error || errors.tasks}
        </p>
      )}

      {viewMode === 'list' && recommendedTask && !loading.tasks && (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-cyan-400/20 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-transparent p-4 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/75">
                AI Recommendation
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-white">
                Start: {recommendedTask.title}
              </p>
              <p className="mt-1 text-sm text-white/65">
                {getSubjectLabel(recommendedTask.subject)} - {formatFocusSummary(
                  recommendedTask.totalFocusTime,
                  recommendedTask.sessionsCount
                )}
              </p>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleStartFocus(recommendedTask)}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.28)]"
            >
              Start Focus
            </motion.button>
          </div>
        </div>
      )}

      {viewMode === 'calendar' && calendarView}

      {viewMode === 'list' && (
        <div className="mx-auto grid w-full max-w-3xl gap-4 overflow-x-hidden box-border">
        <AnimatePresence>
          {showSwipeHint && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.65, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-xs text-white/70 md:hidden"
            >
              Swipe right to complete | Swipe left to delete
            </motion.p>
          )}
        </AnimatePresence>

        {loading.tasks && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300">
            Loading tasks...
          </div>
        )}

        {!loading.tasks && tasks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <ListTodo className="h-5 w-5 text-white/70" />
              </div>
              <span>Start by adding your first task.</span>
            </div>
          </div>
        )}

        {!loading.tasks && tasks.length > 0 && filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300">
            No tasks match the selected filters.
          </div>
        )}

        <AnimatePresence>
          {!loading.tasks &&
            filteredTasks.map((task, index) => {
              const overdue = isOverdueTask(task)
              const dueToday = task.due_date === todayKey
              return (
                <div
                  key={task.id}
                  ref={(node) => {
                    if (node) taskCardRefs.current[task.id] = node
                    else delete taskCardRefs.current[task.id]
                  }}
                >
                  <TaskCard
                    task={task}
                    subjectColorMap={subjectColorMap}
                    getSubjectLabel={getSubjectLabel}
                    isOverdue={overdue}
                    isDueToday={dueToday}
                    isRecommended={task.id === recommendedTaskId}
                    showSwipeNudge={shouldRunSwipeNudge && index === 0}
                    lockActions={lockActions}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onToggleHold={handleToggleHold}
                    onReschedule={handleReschedule}
                    onStartFocus={handleStartFocus}
                    focusSummary={formatFocusSummary(task.totalFocusTime, task.sessionsCount)}
                  />
                </div>
              )
            })}
        </AnimatePresence>
        </div>
      )}

      {!loading.tasks && (
        <p className="mx-auto w-full max-w-3xl text-xs text-white/50">
          Completed today: {completedToday}
        </p>
      )}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-neutral-900/95 p-4 backdrop-blur-xl md:hidden"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 320 }}
              dragElastic={0.18}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setSelectedDate(null)
                }
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Tasks on</p>
                  <p className="text-base font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  Close
                </button>
              </div>
              {selectedTasks.length === 0 && (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                  No tasks scheduled for this day.
                </p>
              )}
              {selectedDayTaskList}
            </motion.div>

            <motion.div
              className="fixed inset-0 z-40 hidden items-center justify-center bg-black/60 p-6 md:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900/95 p-6 backdrop-blur-xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Tasks on</p>
                    <p className="text-lg font-semibold text-white">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                  >
                    Close
                  </button>
                </div>
                {selectedTasks.length === 0 && (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
                    No tasks scheduled for this day.
                  </p>
                )}
                {selectedDayTaskList}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCalendarCreateSheet && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCalendarCreateSheet(false)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-neutral-900/95 p-4 backdrop-blur-xl md:hidden"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 320 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setShowCalendarCreateSheet(false)
                }
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">Quick Create</p>
                  <p className="text-base font-semibold text-white">
                    {dueDate || 'No date selected'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCalendarCreateSheet(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                >
                  Close
                </button>
              </div>
              {renderCreateTaskForm({
                compact: true,
                onCreated: () => setShowCalendarCreateSheet(false)
              })}
            </motion.div>

            <motion.div
              className="fixed inset-0 z-40 hidden items-center justify-center bg-black/60 p-6 md:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCalendarCreateSheet(false)}
            >
              <motion.div
                className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900/95 p-6 backdrop-blur-xl"
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Quick Create</p>
                    <p className="text-lg font-semibold text-white">
                      {dueDate || 'No date selected'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCalendarCreateSheet(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                  >
                    Close
                  </button>
                </div>
                {renderCreateTaskForm({
                  compact: true,
                  onCreated: () => setShowCalendarCreateSheet(false)
                })}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setPaletteOpen(true)}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.35)] backdrop-blur-xl md:hidden"
      >
        <Search className="h-5 w-5" />
      </motion.button>

      <AnimatePresence>
        {paletteOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 pt-24 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPaletteOpen(false)}
          >
            <motion.div
              className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/80 shadow-2xl backdrop-blur-xl"
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-white/10 p-3">
                <input
                  ref={paletteInputRef}
                  type="text"
                  value={paletteQuery}
                  onChange={(event) => setPaletteQuery(event.target.value)}
                  placeholder="Search tasks, filter, or run a command..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-white/45 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <motion.div
                className="max-h-[60vh] overflow-y-auto p-2"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
                }}
              >
                {visibleCommands.map((command, index) => (
                  <motion.button
                    key={command.id}
                    type="button"
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                    onClick={() => executeCommand(command)}
                    variants={{
                      hidden: { opacity: 0, y: 4 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      selectedCommandIndex === index
                        ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                        : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <span>{command.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-white/40">
                      {command.group}
                    </span>
                  </motion.button>
                ))}
                {visibleCommands.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-white/50">
                    No matching commands
                  </p>
                )}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default Tasks
