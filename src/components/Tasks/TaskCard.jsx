import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform
} from 'framer-motion'
import {
  CalendarClock,
  Check,
  CheckCircle2,
  EllipsisVertical,
  Trash2
} from 'lucide-react'

const SWIPE_THRESHOLD = 88

const vibrate = (pattern = 18) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

const TaskCard = ({
  task,
  subjectColorMap,
  getSubjectLabel,
  isOverdue,
  isDueToday,
  showSwipeNudge,
  lockActions,
  disableSwipe = false,
  onToggle,
  onDelete,
  onReschedule
}) => {
  const x = useMotionValue(0)
  const rightReveal = useTransform(x, [0, 120], [0, 1])
  const leftReveal = useTransform(x, [-120, 0], [1, 0])

  const [menuOpen, setMenuOpen] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(task.due_date || '')
  const [actionState, setActionState] = useState('idle')
  const [menuStyle, setMenuStyle] = useState(null)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )
  const cardRef = useRef(null)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const timersRef = useRef([])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        cardRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return
      }
      if (menuOpen) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useLayoutEffect(() => {
    if (!menuOpen || !menuButtonRef.current) return

    const updateMenuPosition = () => {
      const rect = menuButtonRef.current.getBoundingClientRect()
      const minWidth = 176
      const width = minWidth
      const maxLeft = window.innerWidth - width - 12
      const left = Math.min(Math.max(rect.right - width, 12), maxLeft)
      const top = rect.bottom + 8

      setMenuStyle({ top, left, width })
    }

    updateMenuPosition()
    window.addEventListener('resize', updateMenuPosition)
    window.addEventListener('scroll', updateMenuPosition, true)

    return () => {
      window.removeEventListener('resize', updateMenuPosition)
      window.removeEventListener('scroll', updateMenuPosition, true)
    }
  }, [menuOpen])

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer))
    }
  }, [])

  useEffect(() => {
    if (!showSwipeNudge || !isMobile || lockActions) return
    const controls = animate(x, [0, -20, 16, -10, 0], {
      duration: 1.2,
      ease: 'easeInOut'
    })
    return () => controls.stop()
  }, [showSwipeNudge, isMobile, lockActions, x])

  const statusPills = useMemo(() => {
    const pills = []
    if (isOverdue && !task.completed) {
      pills.push({
        label: 'Overdue',
        className: 'border-red-500/25 bg-red-500/10 text-red-300'
      })
    } else if (isDueToday && !task.completed) {
      pills.push({
        label: 'Due Today',
        className: 'border-amber-400/25 bg-amber-400/10 text-amber-200'
      })
    }

    pills.push({
      label: task.completed ? 'Done' : 'Active',
      className: task.completed
        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
        : 'border-white/15 bg-white/5 text-white/70'
    })

    return pills.slice(0, 2)
  }, [isDueToday, isOverdue, task.completed])

  const queueTimer = (callback, delay) => {
    const timer = setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  const resetSwipe = () => {
    animate(x, 0, { type: 'spring', stiffness: 340, damping: 30 })
  }

  const triggerComplete = () => {
    if (lockActions || task.completed) {
      resetSwipe()
      return
    }

    vibrate([10, 20, 10])
    animate(x, 110, { duration: 0.2, ease: 'easeOut' })
    setActionState('complete')
    queueTimer(() => {
      onToggle(task.id, task.completed)
    }, 170)
    queueTimer(() => {
      setActionState('idle')
      resetSwipe()
    }, 420)
  }

  const triggerDelete = () => {
    if (lockActions) {
      resetSwipe()
      return
    }

    vibrate(24)
    animate(x, -110, { duration: 0.2, ease: 'easeOut' })
    setActionState('delete')
    queueTimer(() => {
      onDelete(task.id)
    }, 170)
    queueTimer(() => {
      setActionState('idle')
      resetSwipe()
    }, 420)
  }

  const handleDragEnd = (_, info) => {
    if (!isMobile || lockActions) {
      resetSwipe()
      return
    }

    if (info.offset.x > SWIPE_THRESHOLD) {
      triggerComplete()
      return
    }

    if (info.offset.x < -SWIPE_THRESHOLD) {
      triggerDelete()
      return
    }

    resetSwipe()
  }

  const handleRescheduleSave = () => {
    if (!rescheduleDate || lockActions) return
    onReschedule(task.id, rescheduleDate)
    setShowReschedule(false)
    setMenuOpen(false)
    resetSwipe()
  }

  const cardExit = {
    idle: { opacity: 1, scale: 1 },
    complete: { opacity: 0, scale: 0.98, transition: { duration: 0.24, ease: 'easeOut' } },
    delete: { opacity: 0, scale: 0.94, transition: { duration: 0.22, ease: 'easeOut' } }
  }

  return (
    <div ref={cardRef} className="relative z-0 w-full max-w-full overflow-hidden rounded-xl box-border">
      <motion.div
        style={{ opacity: rightReveal }}
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/45 to-emerald-400/10"
      />
      <motion.div
        style={{ opacity: leftReveal }}
        className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-l from-red-500/45 to-red-400/10"
      />

      <motion.div
        style={{ opacity: rightReveal }}
        className="pointer-events-none absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-emerald-400/30 bg-emerald-500/20 p-2 text-emerald-100"
      >
        <CheckCircle2 className="h-4 w-4" />
      </motion.div>
      <motion.div
        style={{ opacity: leftReveal }}
        className="pointer-events-none absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-red-400/30 bg-red-500/20 p-2 text-red-100"
      >
        <Trash2 className="h-4 w-4" />
      </motion.div>

      <motion.div
        layout
        drag={!disableSwipe && isMobile && !lockActions ? 'x' : false}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.22}
        onDragEnd={handleDragEnd}
        style={{ x }}
        animate={cardExit[actionState]}
        whileTap={{ scale: 0.985 }}
        initial={{ opacity: 0, y: 8 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`w-full max-w-full box-border rounded-xl border bg-white/5 px-4 py-3 backdrop-blur-xl transition-all duration-300 ease-out hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] ${
          isOverdue ? 'border-red-500/35 bg-red-500/10' : 'border-white/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              className={`truncate text-sm font-semibold ${
                task.completed ? 'text-white/50 line-through' : 'text-white'
              }`}
            >
              {task.title}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-1 text-xs ${
                  subjectColorMap[task.subject] || 'bg-white/10 text-zinc-200'
                }`}
              >
                {getSubjectLabel(task.subject)}
              </span>

              {statusPills.map((pill) => (
                <span
                  key={pill.label}
                  className={`rounded-full border px-2 py-1 text-xs ${pill.className}`}
                >
                  {pill.label}
                </span>
              ))}
            </div>

            <p className="mt-2 text-xs text-white/60">
              Due: {task.due_date || 'No date'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            ref={menuButtonRef}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <EllipsisVertical className="h-4 w-4" />
          </button>
        </div>

        {typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              {menuOpen && menuStyle && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.96, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  style={menuStyle}
                  className="fixed z-[999] rounded-xl border border-white/10 bg-neutral-900/95 p-2 shadow-xl backdrop-blur-xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      triggerComplete()
                    }}
                    disabled={lockActions || task.completed}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 transition hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Mark as done
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReschedule((prev) => !prev)
                      setMenuOpen(false)
                    }}
                    disabled={lockActions}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 transition hover:bg-blue-500/10 hover:text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      triggerDelete()
                    }}
                    disabled={lockActions}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/80 transition hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}

        <AnimatePresence>
          {showReschedule && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-black/30 p-2"
            >
              <input
                type="date"
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-purple-400/40"
              />
              <button
                type="button"
                onClick={handleRescheduleSave}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/15"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setShowReschedule(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default TaskCard
