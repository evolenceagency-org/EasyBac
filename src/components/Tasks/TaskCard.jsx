import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Trash2 } from 'lucide-react'

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
      className={`rounded-xl border bg-white/5 px-5 py-4 backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] ${
        isOverdue ? 'border-red-500/40 bg-red-500/10' : 'border-white/10'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id, task.completed)}
            disabled={lockActions}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-purple-400 shadow-[0_0_8px_rgba(139,92,246,0.5)] disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div>
            <p
              className={`text-sm font-semibold ${
                task.completed ? 'text-white/50 line-through' : 'text-white'
              }`}
            >
              {task.title}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span
                className={`rounded-full px-3 py-1 ${
                  subjectColorMap[task.subject] || 'bg-white/10 text-zinc-200'
                }`}
                style={{ boxShadow: '0 0 8px currentColor' }}
              >
                {getSubjectLabel(task.subject)}
              </span>
              <span className="text-white/60">
                Due: {task.due_date || 'No date'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isOverdue && (
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-300">
              Overdue
            </span>
          )}
          {isDueToday && !isOverdue && (
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
              Due Today
            </span>
          )}
          <span
            className={`rounded-full border px-4 py-2 text-xs ${
              task.completed
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {task.completed ? 'Completed' : 'Active'}
          </span>
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={lockActions}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={lockActions}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-red-400/40 hover:shadow-[0_0_12px_rgba(244,63,94,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
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
                className="rounded-full bg-white/10 px-4 py-2 text-xs text-white transition hover:shadow-[0_0_12px_rgba(139,92,246,0.3)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reschedule
              </button>
              <button
                type="button"
                onClick={() => onDismiss(task.id)}
                disabled={lockActions}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
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
