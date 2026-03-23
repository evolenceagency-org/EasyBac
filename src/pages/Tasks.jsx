import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, ChevronLeft, ChevronRight, ListTodo, MoreHorizontal, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { toDateKey } from '../utils/dateUtils.js'
import { isSubscriptionActive } from '../utils/subscription.js'
import { checkTrialAndBlock } from '../utils/subscriptionGuard.js'
import {
  getTasksCompletedToday,
  getTasksDueToday,
  isOverdueTask
} from '../utils/taskStats.js'
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

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [dueFilter, setDueFilter] = useState('all')
  const [sortOption, setSortOption] = useState('newest')

  const [showSwipeHint, setShowSwipeHint] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  const [showSwipeNudge, setShowSwipeNudge] = useState(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 768) return false
    return window.localStorage.getItem('tasks-swipe-nudge-done') !== '1'
  })
  const [showCreatePanel, setShowCreatePanel] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [viewMode, setViewMode] = useState('list')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [draggingTaskId, setDraggingTaskId] = useState(null)
  const [dragOverDayKey, setDragOverDayKey] = useState(null)
  const [showCalendarCreateSheet, setShowCalendarCreateSheet] = useState(false)
  const [activePressDayKey, setActivePressDayKey] = useState(null)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)

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

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(
      (task) => getTaskStatus(task) !== 'archived_overdue'
    )

    if (subjectFilter !== 'all') {
      result = result.filter((task) => task.subject === subjectFilter)
    }

    if (statusFilter === 'completed') {
      result = result.filter((task) => getTaskStatus(task) === 'completed')
    } else if (statusFilter === 'pending') {
      result = result.filter((task) => getTaskStatus(task) === 'active')
    } else if (statusFilter === 'overdue') {
      result = result.filter(
        (task) => isOverdueTask(task) && getTaskStatus(task) !== 'completed'
      )
    }

    if (dueFilter === 'today') {
      result = result.filter((task) => task.due_date === todayKey)
    } else if (dueFilter === 'overdue') {
      result = result.filter(
        (task) => isOverdueTask(task) && getTaskStatus(task) !== 'completed'
      )
    }

    const getCreatedTime = (task) =>
      task.created_at ? new Date(task.created_at).getTime() : 0

    const getDueTimeNearest = (task) =>
      task.due_date ? new Date(`${task.due_date}T00:00:00`).getTime() : Infinity

    const getDueTimeLatest = (task) =>
      task.due_date ? new Date(`${task.due_date}T00:00:00`).getTime() : -Infinity

    result.sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
          return getCreatedTime(a) - getCreatedTime(b)
        case 'due-nearest':
          return getDueTimeNearest(a) - getDueTimeNearest(b)
        case 'due-latest':
          return getDueTimeLatest(b) - getDueTimeLatest(a)
        case 'subject':
          return (a.subject || '').localeCompare(b.subject || '')
        case 'newest':
        default:
          return getCreatedTime(b) - getCreatedTime(a)
      }
    })

    return result
  }, [tasks, subjectFilter, statusFilter, dueFilter, sortOption, todayKey])

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
        compact ? 'md:grid-cols-1' : 'md:mt-6 md:grid-cols-[2fr_1fr_1fr_auto] md:gap-4'
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
        className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Add Task'}
      </motion.button>
    </form>
  )

  const filtersPanel = (
    <div className="flex flex-col gap-3">
      <div className="w-full sm:max-w-[240px]">
        <GlassDropdown
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={subjects}
        />
      </div>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'Pending', value: 'pending' },
          { label: 'Completed', value: 'completed' },
          { label: 'Overdue', value: 'overdue' }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setStatusFilter(item.value)}
            className={`rounded-full px-4 py-1 text-xs transition ${
              statusFilter === item.value
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                : 'border border-white/10 bg-white/5 text-white/70'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All tasks', value: 'all' },
          { label: 'Due today', value: 'today' },
          { label: 'Overdue tasks', value: 'overdue' }
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setDueFilter(item.value)}
            className={`rounded-full px-4 py-1 text-xs transition ${
              dueFilter === item.value
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                : 'border border-white/10 bg-white/5 text-white/70'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="w-full sm:max-w-[280px]">
        <GlassDropdown
          value={sortOption}
          onChange={setSortOption}
          options={[
            { label: 'Newest first', value: 'newest' },
            { label: 'Oldest first', value: 'oldest' },
            { label: 'Due date (nearest first)', value: 'due-nearest' },
            { label: 'Due date (latest first)', value: 'due-latest' },
            { label: 'Subject alphabetical', value: 'subject' }
          ]}
        />
      </div>
    </div>
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
            showSwipeNudge={false}
            lockActions={lockActions}
            disableSwipe
            onToggle={handleToggle}
            onDelete={handleDelete}
            onReschedule={handleReschedule}
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
      className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden box-border md:gap-6"
    >
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

      <div className="grid gap-3 md:hidden">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setShowCreatePanel((prev) => !prev)
            setShowFilterPanel(false)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur-xl"
        >
          <Plus className="h-4 w-4" />
          Create Task
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setShowFilterPanel((prev) => !prev)
            setShowCreatePanel(false)
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur-xl"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
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
            <p className="text-xs uppercase tracking-wide text-white/70">
              Create Task
            </p>
            {renderCreateTaskForm()}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden glass overflow-visible rounded-2xl p-4 md:block md:p-6">
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

      {(error || errors.tasks) && (
        <p className="md:hidden rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error || errors.tasks}
        </p>
      )}

      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="glass overflow-visible rounded-2xl p-4 md:hidden"
          >
            {filtersPanel}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative hidden md:block">
        <div className="pointer-events-none absolute -top-10 left-1/2 hidden h-52 w-52 -translate-x-1/2 rounded-full bg-purple-500/10 blur-3xl md:block" />
        <div className="glass overflow-visible rounded-2xl p-4 md:p-6">
          {filtersPanel}
        </div>
      </div>

      {viewMode === 'calendar' && calendarView}

      {viewMode === 'list' && (
        <div className="grid w-full max-w-full gap-4 overflow-x-hidden box-border">
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
                <TaskCard
                  key={task.id}
                  task={task}
                  subjectColorMap={subjectColorMap}
                  getSubjectLabel={getSubjectLabel}
                  isOverdue={overdue}
                  isDueToday={dueToday}
                  showSwipeNudge={shouldRunSwipeNudge && index === 0}
                  lockActions={lockActions}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onReschedule={handleReschedule}
                />
              )
            })}
        </AnimatePresence>
        </div>
      )}

      {!loading.tasks && (
        <p className="text-xs text-white/50">
          Completed today: {completedToday}
        </p>
      )}

      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              className="pointer-events-none fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-white/10 bg-neutral-900/95 p-4 backdrop-blur-xl md:hidden"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
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
              className="pointer-events-none fixed inset-0 z-40 hidden items-center justify-center bg-black/60 p-6 md:flex"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-900/95 p-6 backdrop-blur-xl"
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
              initial={{ y: 90, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 90, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
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
    </motion.div>
  )
}

export default Tasks
