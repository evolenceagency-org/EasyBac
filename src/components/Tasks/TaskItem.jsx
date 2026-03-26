import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, animate, motion } from 'framer-motion'
import {
  CalendarClock,
  Check,
  EllipsisVertical,
  GripVertical,
  Play,
  Trash2
} from 'lucide-react'
import { GhostButton, IconButton, ListItem } from '../ui/index.js'
import usePressHold from '../../hooks/usePressHold.js'
import useSwipeGesture from '../../hooks/useSwipeGesture.js'
import { MOTION, motionPresets } from '../../utils/motion.js'

const vibrate = (pattern = 18) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

const TaskItem = ({
  task,
  getSubjectLabel,
  isOverdue,
  isDueToday,
  showSwipeNudge,
  lockActions,
  disableSwipe = false,
  onToggle,
  onDelete,
  onReschedule,
  onStartFocus,
  focusSummary,
  isRecommended = false,
  onToggleHold,
  dragHandleProps = null,
  isDragging = false
}) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(task.due_date || '')
  const [menuStyle, setMenuStyle] = useState(null)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const cardRef = useRef(null)
  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)
  const timersRef = useRef([])

  const swipeEnabled = !disableSwipe && isMobile && !lockActions && !isDragging
  const swipe = useSwipeGesture({
    enabled: swipeEnabled,
    onComplete: () => {
      if (!task.completed) {
        vibrate([10, 16, 10])
        onToggle?.(task.id, task.completed)
      }
    },
    onDelete: () => {
      vibrate(24)
      onDelete?.(task.id)
    },
    onReset: () => {
      // no-op, hook handles reset motion
    }
  })

  const pressHoldMenu = usePressHold(
    () => {
      if (lockActions) return
      setMenuOpen(true)
      vibrate(18)
    },
    { delay: 360, disabled: !isMobile }
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cardRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      if (menuOpen) setMenuOpen(false)
    }

    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen || !menuButtonRef.current) return undefined

    const updateMenuPosition = () => {
      const rect = menuButtonRef.current.getBoundingClientRect()
      const width = 180
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
      timersRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!showSwipeNudge || !isMobile || lockActions) return undefined
    const controls = animate(swipe.x, [0, -12, 10, -6, 0], {
      duration: MOTION.slow,
      ease: MOTION.easeOut
    })
    return () => controls.stop()
  }, [isMobile, lockActions, showSwipeNudge, swipe.x])

  const statusText = useMemo(() => {
    if (task.completed) return 'Done'
    if (task.status === 'on_hold') return 'On hold'
    if (isOverdue) return 'Overdue'
    if (isDueToday) return 'Due today'
    return 'Active'
  }, [isDueToday, isOverdue, task.completed, task.status])

  const queueTimer = (callback, delay) => {
    const timer = window.setTimeout(callback, delay)
    timersRef.current.push(timer)
  }

  const triggerReschedule = () => {
    if (!rescheduleDate || lockActions) return
    onReschedule?.(task.id, rescheduleDate)
    setShowReschedule(false)
    setMenuOpen(false)
    swipe.reset()
  }

  const metaText = `${getSubjectLabel(task.subject)} • ${task.due_date || 'No date'} • ${statusText}`
  const dragEnabled = Boolean(dragHandleProps)

  return (
    <div ref={cardRef} className="relative w-full overflow-visible">
      {isMobile && !lockActions ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute inset-y-0 left-0 flex w-1/2 items-center justify-start bg-emerald-500/8 pl-4 text-[10px] font-medium uppercase tracking-[0.24em] text-emerald-200/60">
            Complete
          </div>
          <div className="absolute inset-y-0 right-0 flex w-1/2 items-center justify-end bg-rose-500/8 pr-4 text-[10px] font-medium uppercase tracking-[0.24em] text-rose-200/60">
            Delete
          </div>
        </div>
      ) : null}

      <motion.div
        {...swipe.dragProps}
        whileTap={{ scale: 0.992 }}
        whileHover={!isMobile ? { backgroundColor: 'rgba(255,255,255,0.03)' } : undefined}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: swipe.actionState === 'idle' ? 1 : 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={motionPresets.fadeSlide({ distance: 4, duration: MOTION.normal }).transition}
        onPointerDown={(event) => {
          if (isMobile) pressHoldMenu.bind.onPointerDown(event)
        }}
        onPointerUp={() => {
          if (isMobile) pressHoldMenu.bind.onPointerUp()
        }}
        onPointerCancel={() => {
          if (isMobile) pressHoldMenu.bind.onPointerCancel()
        }}
        onPointerLeave={() => {
          if (isMobile) pressHoldMenu.bind.onPointerLeave()
        }}
        className="relative"
      >
        <ListItem
          title={task.title}
          meta={metaText}
          badge={isRecommended ? 'Recommended' : null}
          muted={task.completed}
          trailing={
            <div className="flex items-center gap-1.5">
              {dragEnabled ? (
                <IconButton
                  {...dragHandleProps}
                  className="hidden h-8 w-8 cursor-grab text-[#8B96A8] hover:text-[#F8FAFC] md:inline-flex"
                  aria-label="Reorder task"
                  title="Reorder task"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                </IconButton>
              ) : null}
              <GhostButton
                className="px-2.5 py-1 text-[11px]"
                onClick={() => onStartFocus?.(task)}
                disabled={lockActions || task.status === 'on_hold'}
              >
                <Play className="mr-1 h-3.5 w-3.5" />
                Start
              </GhostButton>
              <IconButton
                ref={menuButtonRef}
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Open task actions"
                className="h-8 w-8"
              >
                <EllipsisVertical className="h-4 w-4" />
              </IconButton>
            </div>
          }
        >
          {focusSummary ? <p className="text-[11px] text-[#8B96A8]">{focusSummary}</p> : null}
        </ListItem>
      </motion.div>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {menuOpen && menuStyle ? (
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, scale: 0.98, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -4 }}
                transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
                style={menuStyle}
                className="fixed z-[999] rounded-xl bg-neutral-950/96 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    if (!task.completed) {
                      vibrate([10, 16, 10])
                      onToggle?.(task.id, task.completed)
                    }
                  }}
                  disabled={lockActions || task.completed}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/76 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark as done
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onToggleHold?.(task)
                  }}
                  disabled={lockActions || task.completed}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/76 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  {task.status === 'on_hold' ? 'Resume task' : 'Put on hold'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReschedule((prev) => !prev)
                    setMenuOpen(false)
                  }}
                  disabled={lockActions}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/76 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Reschedule
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    queueTimer(() => onDelete?.(task.id), 120)
                  }}
                  disabled={lockActions}
                  className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/76 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body
        )}

      <AnimatePresence>
        {showReschedule ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: MOTION.fast, ease: MOTION.easeOut }}
            className="mt-2 flex items-center gap-2 rounded-xl bg-white/[0.03] p-2"
          >
            <input
              type="date"
              value={rescheduleDate}
              onChange={(event) => setRescheduleDate(event.target.value)}
              className="min-w-0 flex-1 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-[#F8FAFC] outline-none ring-1 ring-white/[0.06] focus:ring-white/[0.12]"
            />
            <GhostButton className="px-3 py-2 text-[11px]" onClick={triggerReschedule}>
              Save
            </GhostButton>
            <GhostButton className="px-3 py-2 text-[11px]" onClick={() => setShowReschedule(false)}>
              Cancel
            </GhostButton>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default TaskItem
