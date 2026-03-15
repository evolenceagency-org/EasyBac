import { useCallback, useMemo, useState } from 'react'
import { toDateKey } from '../utils/dateUtils.js'
import { AnimatePresence, motion } from 'framer-motion'
import { useData } from '../context/DataContext.jsx'
import {
  getTasksCompletedToday,
  getTasksDueToday,
  isOverdueTask
} from '../utils/taskStats.js'

const pageMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const subjects = [
  { label: 'All', value: 'all' },
  { label: 'Math', value: 'math', color: 'bg-violet-500/20 text-violet-200' },
  { label: 'Physics', value: 'physics', color: 'bg-blue-500/20 text-blue-200' },
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

const formatDate = (value) => {
  if (!value) return 'No date'
  const date =
    typeof value === 'string' && value.length === 10
      ? new Date(`${value}T00:00:00`)
      : new Date(value)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

const Tasks = () => {
  const { tasks, loading, errors, addTask, toggleTask, removeTask } = useData()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('math')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dueFilter, setDueFilter] = useState('all')
  const [sortOption, setSortOption] = useState('newest')

  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const handleCreate = useCallback(
    async (event) => {
      event.preventDefault()
      if (!title.trim()) return

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
      } catch (err) {
        setError('Unable to create the task. Please try again.')
      } finally {
        setSaving(false)
      }
    },
    [title, subject, dueDate, addTask]
  )

  const handleToggle = useCallback(
    async (taskId, currentCompleted) => {
      setError('')
      try {
        await toggleTask(taskId, currentCompleted)
      } catch (err) {
        setError('Unable to update the task status.')
      }
    },
    [toggleTask]
  )

  const handleDelete = useCallback(
    async (taskId) => {
      setError('')
      try {
        await removeTask(taskId)
      } catch (err) {
        setError('Unable to delete the task.')
      }
    },
    [removeTask]
  )

  const filteredTasks = useMemo(() => {
    let result = [...tasks]

    if (subjectFilter !== 'all') {
      result = result.filter((task) => task.subject === subjectFilter)
    }

    if (statusFilter === 'completed') {
      result = result.filter((task) => task.completed)
    } else if (statusFilter === 'pending') {
      result = result.filter((task) => !task.completed)
    }

    if (dueFilter === 'today') {
      result = result.filter((task) => task.due_date === todayKey)
    } else if (dueFilter === 'overdue') {
      result = result.filter((task) => isOverdueTask(task))
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

  const tasksDueToday = useMemo(() => getTasksDueToday(tasks), [tasks])
  const completedToday = useMemo(
    () => getTasksCompletedToday(tasks),
    [tasks]
  )
  const progressTotal = tasksDueToday.length
  const progressDone = tasksDueToday.filter((task) => task.completed).length
  const progressPercent =
    progressTotal === 0 ? 0 : Math.round((progressDone / progressTotal) * 100)

  return (
    <motion.div
      variants={pageMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Task Productivity
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Today's Task Progress</h3>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-zinc-300">
            <span>
              {progressDone} / {progressTotal} tasks completed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {progressTotal === 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              No tasks due today. You're clear.
            </p>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Create Task
        </p>
        <h3 className="mt-2 text-2xl font-semibold">Plan your next moves</h3>
        <form
          onSubmit={handleCreate}
          className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr_auto]"
        >
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
          />
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200"
          >
            {subjects
              .filter((item) => item.value !== 'all')
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Add Task'}
          </button>
        </form>
        {(error || errors.tasks) && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error || errors.tasks}
          </p>
        )}
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={subjectFilter}
            onChange={(event) => setSubjectFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
          >
            {subjects.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
          >
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={dueFilter}
            onChange={(event) => setDueFilter(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
          >
            <option value="all">All tasks</option>
            <option value="today">Due today</option>
            <option value="overdue">Overdue tasks</option>
          </select>
          <select
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="due-nearest">Due date (nearest first)</option>
            <option value="due-latest">Due date (latest first)</option>
            <option value="subject">Subject alphabetical</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4">
        {loading.tasks && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300">
            Loading tasks...
          </div>
        )}

        {!loading.tasks && filteredTasks.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-zinc-300">
            No tasks match the selected filters.
          </div>
        )}

        <AnimatePresence>
          {!loading.tasks &&
            filteredTasks.map((task) => {
              const overdue = isOverdueTask(task)
              const dueToday = task.due_date === todayKey
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-2xl border px-5 py-4 ${
                    overdue
                      ? 'border-red-500/40 bg-red-500/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggle(task.id, task.completed)}
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            task.completed ? 'text-zinc-400 line-through' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                          <span
                            className={`rounded-full px-3 py-1 ${
                              subjectColorMap[task.subject] ||
                              'bg-white/10 text-zinc-200'
                            }`}
                          >
                            {getSubjectLabel(task.subject)}
                          </span>
                          <span>Created: {formatDate(task.created_at)}</span>
                          <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {overdue && (
                        <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">
                          Overdue
                        </span>
                      )}
                      {dueToday && !overdue && (
                        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200">
                          Due Today
                        </span>
                      )}
                      <span className="rounded-full bg-white/10 px-4 py-2 text-xs text-zinc-200">
                        {task.completed ? 'Completed' : 'Pending'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
        </AnimatePresence>
      </div>

      {!loading.tasks && (
        <p className="text-xs text-zinc-500">
          Completed today: {completedToday}
        </p>
      )}
    </motion.div>
  )
}

export default Tasks


