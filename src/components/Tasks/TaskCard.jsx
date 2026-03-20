import { useState } from 'react'
import { motion } from 'framer-motion'

const TaskCard = ({
  task,
  subjectColorMap,
  getSubjectLabel,
  isOverdue,
  isDueToday,
  lockActions,
  onToggle,
  onDelete,
  onEdit,
  onReschedule,
  onDismiss
}) => {
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(task.due_date || '')

  const handleReschedule = () => {
    if (!rescheduleDate) return
    onReschedule(task.id, rescheduleDate)
    setShowReschedule(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`rounded-2xl border px-5 py-4 ${
        isOverdue
          ? 'border-red-500/40 bg-red-500/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id, task.completed)}
            disabled={lockActions}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
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
                  subjectColorMap[task.subject] || 'bg-white/10 text-zinc-200'
                }`}
              >
                {getSubjectLabel(task.subject)}
              </span>
              <span>Due: {task.due_date || 'No date'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isOverdue && (
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-200">
              Overdue
            </span>
          )}
          {isDueToday && !isOverdue && (
            <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200">
              Due Today
            </span>
          )}
          <span className="rounded-full bg-white/10 px-4 py-2 text-xs text-zinc-200">
            {task.completed ? 'Completed' : 'Active'}
          </span>
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={lockActions}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={lockActions}
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>

      {isOverdue && !task.completed && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!showReschedule ? (
            <>
              <button
                type="button"
                onClick={() => setShowReschedule(true)}
                disabled={lockActions}
                className="rounded-full bg-white/10 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => onDismiss(task.id)}
                disabled={lockActions}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Dismiss
              </button>
            </>
          ) : (
            <>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200"
              />
              <button
                type="button"
                onClick={handleReschedule}
                className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-900"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowReschedule(false)}
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-white"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default TaskCard
