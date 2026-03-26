import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const EditTaskModal = ({ task, subjects, onSave, onClose }) => {
  const [title, setTitle] = useState(task?.title || '')
  const [subject, setSubject] = useState(task?.subject || 'math')
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const canSave = title.trim().length > 0

  useEffect(() => {
    setTitle(task?.title || '')
    setSubject(task?.subject || 'math')
    setDueDate(task?.due_date || '')
  }, [task])

  if (!task) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!canSave) return
    onSave({
      title: title.trim(),
      subject,
      due_date: dueDate || null
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/[0.12] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <h3 className="text-xl font-semibold">Edit Task</h3>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task title"
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-400"
          />
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200"
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
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-full bg-[#5B8CFF] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2 text-sm font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default EditTaskModal
