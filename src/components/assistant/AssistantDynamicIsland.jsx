import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  Mic,
  Sparkles
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const NO_SELECT_STYLE = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent'
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

const useViewportWidth = () => {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 1280
    return window.innerWidth || 1280
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const update = () => setWidth(window.innerWidth || 1280)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return width
}

const shellToneClasses = {
  neutral:
    'border-white/[0.08] bg-[#070b12]/94 shadow-[0_18px_44px_rgba(0,0,0,0.32)]',
  suggestion:
    'border-[#5B8CFF]/18 bg-[#070b12]/95 shadow-[0_18px_46px_rgba(91,140,255,0.12)]',
  active:
    'border-cyan-400/18 bg-[#070b12]/95 shadow-[0_18px_46px_rgba(34,211,238,0.12)]',
  warning:
    'border-amber-300/18 bg-[#070b12]/95 shadow-[0_18px_46px_rgba(251,191,36,0.12)]',
  success:
    'border-emerald-400/18 bg-[#070b12]/95 shadow-[0_18px_46px_rgba(16,185,129,0.12)]'
}

const iconBubbleToneClasses = {
  neutral: 'bg-white/[0.05] text-white ring-white/[0.06]',
  suggestion: 'bg-[#5B8CFF]/14 text-[#D9E6FF] ring-[#5B8CFF]/18',
  active: 'bg-cyan-400/14 text-cyan-50 ring-cyan-400/18',
  warning: 'bg-amber-300/14 text-amber-50 ring-amber-300/18',
  success: 'bg-emerald-400/14 text-emerald-50 ring-emerald-400/18'
}

const chipToneClasses = {
  neutral: 'bg-white/[0.05] text-[#D7DCE6]',
  suggestion: 'bg-[#5B8CFF]/10 text-[#D9E6FF]',
  active: 'bg-cyan-400/10 text-cyan-50',
  warning: 'bg-amber-300/10 text-amber-50',
  success: 'bg-emerald-400/10 text-emerald-50',
  error: 'bg-rose-400/10 text-rose-50'
}

const gestureToneClasses = {
  left: 'bg-rose-500/15 text-rose-100 ring-rose-400/20',
  right: 'bg-emerald-500/15 text-emerald-100 ring-emerald-400/20',
  up: 'bg-white/10 text-white ring-white/10',
  down: 'bg-white/10 text-white ring-white/10'
}

const pageMotionVariants = {
  initial: (direction) => ({
    opacity: 0,
    y: direction > 0 ? 6 : -6
  }),
  animate: {
    opacity: 1,
    y: 0
  },
  exit: (direction) => ({
    opacity: 0,
    y: direction > 0 ? -4 : 4
  })
}

const StatusGlyph = ({ mode, label }) => {
  if (mode === 'listening') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-flex items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <motion.span
              key={index}
              className="block w-1 rounded-full bg-current"
              animate={{ height: [5, 11 + (index % 2) * 2, 7 + (index % 3), 5] }}
              transition={{
                duration: 0.72,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
                delay: index * 0.08
              }}
            />
          ))}
        </span>
        <span>{label || 'Listening'}</span>
      </span>
    )
  }

  if (mode === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>{label || 'Processing'}</span>
      </span>
    )
  }

  if (mode === 'executing') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
          <motion.span
            className="absolute inset-y-0 left-0 w-3 rounded-full bg-white"
            animate={{ x: [-12, 12, -12] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
        <span>{label || 'Executing'}</span>
      </span>
    )
  }

  if (mode === 'success') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label || 'Done'}</span>
      </span>
    )
  }

  if (mode === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label || 'Error'}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-white/45" aria-hidden="true" />
      <span>{label || 'Ready'}</span>
    </span>
  )
}

const AssistantDynamicIsland = ({
  page,
  pageDirection = 1,
  statusMode = 'idle',
  statusLabel = 'Ready',
  holdProgress = 0,
  isHolding = false,
  gestureDirection = null,
  gestureProps = {},
  className
}) => {
  const width = useViewportWidth()
  const isMobile = width < 768
  const positionClass = isMobile
    ? 'top-[calc(env(safe-area-inset-top)+0.75rem)]'
    : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'

  const tone = page?.tone || 'neutral'
  const Icon = page?.icon || Sparkles
  const text = page?.message || 'Ready'
  const chipLabel = statusMode === 'idle' ? (statusLabel || page?.status || 'Ready') : (statusLabel || 'Ready')

  const shellToneClass = shellToneClasses[tone] || shellToneClasses.neutral

  const { style: gestureStyle, ...gestureHandlers } = gestureProps

  const swipeBadge = useMemo(() => {
    if (!gestureDirection) return null

    if (gestureDirection === 'left') return { icon: CircleAlert, className: gestureToneClasses.left, anchor: 'left' }
    if (gestureDirection === 'right') return { icon: CheckCircle2, className: gestureToneClasses.right, anchor: 'right' }
    if (gestureDirection === 'up') return { icon: ChevronUp, className: gestureToneClasses.up, anchor: 'top' }
    return { icon: ChevronDown, className: gestureToneClasses.down, anchor: 'bottom' }
  }, [gestureDirection])

  const SwipeIcon = swipeBadge?.icon || null

  const shellWidth = isMobile ? 'min(92vw, 420px)' : 'min(420px, 30vw)'
  const shellHeight = 60

  return (
    <div
      className={cn('fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none', positionClass, className)}
      style={NO_SELECT_STYLE}
      onContextMenu={(event) => event.preventDefault()}
    >
      <AnimatePresence initial={false}>
        {swipeBadge ? (
          <motion.div
            key={`swipe-${gestureDirection}`}
            initial={{ opacity: 0, scale: 0.84 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.84 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className={cn(
              'pointer-events-none absolute flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md',
              swipeBadge.className,
              swipeBadge.anchor === 'left' && '-left-10 top-1/2 -translate-y-1/2',
              swipeBadge.anchor === 'right' && '-right-10 top-1/2 -translate-y-1/2',
              swipeBadge.anchor === 'top' && 'left-1/2 -top-10 -translate-x-1/2',
              swipeBadge.anchor === 'bottom' && 'left-1/2 -bottom-10 -translate-x-1/2'
            )}
          >
            {SwipeIcon ? <SwipeIcon className="h-4 w-4" aria-hidden="true" /> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={{
          scale: isHolding || statusMode === 'listening' ? 1.03 : 1
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.82 }}
        className={cn(
          'relative pointer-events-auto overflow-hidden rounded-full border backdrop-blur-2xl',
          'shadow-[0_18px_44px_rgba(0,0,0,0.32)]',
          shellToneClass,
          statusMode === 'listening' && 'shadow-[0_18px_52px_rgba(91,140,255,0.18)]',
          statusMode === 'success' && 'shadow-[0_18px_52px_rgba(16,185,129,0.16)]',
          statusMode === 'error' && 'shadow-[0_18px_52px_rgba(244,63,94,0.16)]'
        )}
        style={{
          ...gestureStyle,
          width: shellWidth,
          height: shellHeight,
          willChange: 'transform',
          cursor: 'grab'
        }}
        {...gestureHandlers}
      >
        <AnimatePresence initial={false}>
          {holdProgress > 0 ? (
            <motion.div
              key="hold-ring"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="pointer-events-none absolute -inset-2"
            >
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="2"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill="none"
                  stroke="url(#assistant-island-ring)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ pathLength: holdProgress / 100 }}
                  animate={{ pathLength: holdProgress / 100 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="assistant-island-ring" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="absolute inset-0 pointer-events-none rounded-full bg-gradient-to-b from-white/[0.04] to-transparent opacity-90" />
        <div className="absolute inset-0 pointer-events-none rounded-full bg-[radial-gradient(circle_at_18%_20%,rgba(91,140,255,0.12),transparent_38%),radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.04),transparent_40%)]" />

        <div className="relative flex h-full w-full items-center gap-3 overflow-hidden rounded-full px-3.5">
          <span
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1',
              iconBubbleToneClasses[tone] || iconBubbleToneClasses.neutral
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${page?.key || 'page'}-${page?.message || 'ready'}`}
              custom={pageDirection}
              variants={pageMotionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="min-w-0 flex-1"
              style={NO_SELECT_STYLE}
            >
              <p className="truncate text-[13px] font-medium leading-none text-white md:text-sm">
                {text}
              </p>
            </motion.div>
          </AnimatePresence>

          <span
            className={cn(
              'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[10px] font-medium',
              chipToneClasses[statusMode] || chipToneClasses.neutral
            )}
            style={NO_SELECT_STYLE}
          >
            <StatusGlyph mode={statusMode} label={chipLabel} />
          </span>
        </div>
      </motion.div>
    </div>
  )
}

export default AssistantDynamicIsland
