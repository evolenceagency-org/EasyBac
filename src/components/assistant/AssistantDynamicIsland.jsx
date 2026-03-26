import { AnimatePresence, motion, useTransform } from 'framer-motion'
import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  Mic,
  Sparkles
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { gestureMotion } from '../../utils/motion.js'

const NO_SELECT_STYLE = {
  userSelect: 'none',
  WebkitUserSelect: 'none',
  WebkitTouchCallout: 'none',
  WebkitTapHighlightColor: 'transparent'
}

const cn = (...classes) => classes.filter(Boolean).join(' ')

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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
    'border-[rgba(139,92,246,0.35)] bg-[rgba(10,10,15,0.9)] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]',
  suggestion:
    'border-[rgba(139,92,246,0.35)] bg-[rgba(10,10,15,0.9)] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]',
  active:
    'border-[rgba(139,92,246,0.35)] bg-[rgba(10,10,15,0.9)] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]',
  warning:
    'border-[rgba(139,92,246,0.35)] bg-[rgba(10,10,15,0.9)] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]',
  success:
    'border-[rgba(139,92,246,0.35)] bg-[rgba(10,10,15,0.9)] shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]'
}

const iconBubbleToneClasses = {
  neutral: 'bg-[rgba(91,92,246,0.08)] text-white ring-[rgba(139,92,246,0.18)]',
  suggestion: 'bg-[#7c5cff]/12 text-[#E9E4FF] ring-[#7c5cff]/20',
  active: 'bg-[#7c5cff]/14 text-[#F3EEFF] ring-[#7c5cff]/20',
  warning: 'bg-white/[0.05] text-white ring-white/[0.08]',
  success: 'bg-white/[0.05] text-white ring-white/[0.08]'
}

const chipToneClasses = {
  neutral: 'bg-white/[0.05] text-[#D7DCE6]',
  suggestion: 'bg-[#7c5cff]/10 text-[#E9E4FF]',
  active: 'bg-[#7c5cff]/12 text-[#F3EEFF]',
  warning: 'bg-white/[0.06] text-[#E7E9EF]',
  success: 'bg-white/[0.06] text-[#E7E9EF]',
  error: 'bg-white/[0.06] text-[#E7E9EF]'
}

const StatusGlyph = ({ mode, label, compact = false }) => {
  if (compact) {
    if (mode === 'listening') {
      return (
        <span className="inline-flex items-end gap-0.5" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="block w-1 rounded-full bg-current"
              animate={{ height: [4, 8 + index, 5] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
                delay: index * 0.08
              }}
            />
          ))}
        </span>
      )
    }

    if (mode === 'processing') {
      return (
        <span className="inline-flex items-center gap-0.5" aria-hidden="true">
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-current"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1, 0.9] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-current"
            animate={{ opacity: [1, 0.35, 1], scale: [1, 0.9, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }}
          />
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-current"
            animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1, 0.9] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut', delay: 0.24 }}
          />
        </span>
      )
    }

    if (mode === 'success') {
      return <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
    }

    if (mode === 'error') {
      return <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
    }

    return (
      <span className="inline-flex items-center gap-0.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-45" />
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />
      </span>
    )
  }

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
  isExpanded = false,
  holdProgress = 0,
  isHolding = false,
  gestureDirection = null,
  dragX,
  dragY,
  gestureProps = {},
  containerRef,
  className
}) => {
  const width = useViewportWidth()
  const isMobile = width < 768
  const [isEngaged, setIsEngaged] = useState(false)

  const positionClass = isMobile
    ? 'top-[calc(env(safe-area-inset-top)+0.75rem)]'
    : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))]'

  const tone = page?.tone || 'neutral'
  const Icon = page?.icon || Sparkles
  const text = page?.message || 'Ready'
  const openState = isExpanded || isHolding || statusMode !== 'idle'

  const shellToneClass = shellToneClasses[tone] || shellToneClasses.neutral
  const shellGlowClass = isEngaged || isHolding || statusMode === 'listening'
    ? 'shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_0_20px_rgba(139,92,246,0.25),0_8px_25px_rgba(0,0,0,0.35)]'
    : 'shadow-[0_0_0_1px_rgba(139,92,246,0.15),0_8px_25px_rgba(0,0,0,0.35)]'
  const { style: gestureStyle, ...gestureHandlers } = gestureProps

  const contentResistanceX = useTransform(dragX || 0, (value) => clamp(value * 0.06, -5, 5))
  const contentResistanceY = useTransform(dragY || 0, (value) => clamp(value * 0.05, -4, 4))
  const swipeRightStrength = useTransform(dragX || 0, (value) =>
    value > 0 ? clamp(value / gestureMotion.swipeMax, 0, 1) : 0
  )
  const swipeLeftStrength = useTransform(dragX || 0, (value) =>
    value < 0 ? clamp(Math.abs(value) / gestureMotion.swipeMax, 0, 1) : 0
  )
  const swipeRightOffset = useTransform(dragX || 0, (value) => (value > 0 ? clamp(value * 0.08, 0, 8) : 0))
  const swipeLeftOffset = useTransform(dragX || 0, (value) => (value < 0 ? clamp(value * 0.08, -8, 0) : 0))

  const compactWidth = isMobile ? Math.min(176, Math.max(140, Math.round(width * 0.36))) : 156
  const expandedWidth = isMobile ? Math.min(width - 16, 420) : Math.min(Math.max(420, Math.round(width * 0.32)), 520)
  const compactHeight = 44
  const expandedHeight = 60
  const overlayVariant =
    isHolding || statusMode === 'listening'
      ? 'listening'
      : statusMode === 'processing'
        ? 'processing'
        : statusMode === 'success'
          ? 'success'
          : 'idle'

  const containerMotion = {
    width: openState ? expandedWidth : compactWidth,
    height: openState ? expandedHeight : compactHeight,
    borderRadius: openState ? 28 : 999,
    scale: isEngaged || isHolding ? 1.02 : 1
  }

  return (
    <div
      ref={containerRef}
      className={cn('fixed left-1/2 -translate-x-1/2 z-[80] pointer-events-none', positionClass, className)}
      style={NO_SELECT_STYLE}
      onContextMenu={(event) => event.preventDefault()}
    >
      <motion.div
        initial={false}
        animate={containerMotion}
        transition={{
          width: { type: 'spring', stiffness: 280, damping: 32 },
          height: { type: 'spring', stiffness: 280, damping: 32 },
          borderRadius: { type: 'spring', stiffness: 260, damping: 34 },
          scale: { type: 'spring', stiffness: 280, damping: 28 }
        }}
        onPointerEnter={() => setIsEngaged(true)}
        onPointerLeave={() => setIsEngaged(false)}
        onPointerDown={() => setIsEngaged(true)}
        onPointerUp={() => setIsEngaged(false)}
        onPointerCancel={() => setIsEngaged(false)}
        className={cn(
          'relative pointer-events-auto overflow-hidden border backdrop-blur-2xl will-change-[transform,width,height,opacity]',
          shellToneClass,
          shellGlowClass,
          statusMode === 'success' ? 'ring-1 ring-emerald-400/20' : '',
          statusMode === 'error' ? 'ring-1 ring-rose-400/20' : ''
        )}
        style={{
          ...gestureStyle,
          cursor: 'grab'
        }}
        {...gestureHandlers}
      >
        <div className="absolute inset-0 pointer-events-none">
          <AnimatePresence initial={false}>
            {isHolding || statusMode === 'listening' ? (
              <motion.div
                key="hold-glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(106,92,255,0.42), rgba(139,92,246,0.28), rgba(167,139,250,0.2), rgba(79,70,229,0.22))',
                  boxShadow: '0 0 30px rgba(139,92,246,0.35)'
                }}
              />
            ) : null}
          </AnimatePresence>

          {(isHolding || statusMode === 'listening' || statusMode === 'processing' || statusMode === 'success') ? (
            <motion.div
              key={overlayVariant}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity:
                  overlayVariant === 'listening'
                    ? 1
                    : overlayVariant === 'processing'
                      ? 0.82
                      : overlayVariant === 'success'
                        ? 0.55
                        : 0.65,
                scale: 1
              }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{
                duration: overlayVariant === 'processing' ? 0.28 : 0.18,
                ease: 'easeOut'
              }}
              style={{
                background:
                  overlayVariant === 'listening'
                    ? 'linear-gradient(135deg, rgba(106,92,255,0.34), rgba(139,92,246,0.24), rgba(167,139,250,0.18))'
                    : overlayVariant === 'processing'
                      ? 'linear-gradient(135deg, rgba(106,92,255,0.26), rgba(139,92,246,0.18), rgba(167,139,250,0.12))'
                      : overlayVariant === 'success'
                        ? 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.16), transparent 50%), linear-gradient(135deg, rgba(255,255,255,0.06), rgba(124,92,255,0.08))'
                        : 'radial-gradient(circle at 50% 40%, rgba(124,92,255,0.16), transparent 48%)'
              }}
            />
          ) : null}

          <AnimatePresence initial={false}>
            <motion.div
              key="swipe-right-feedback"
              className="absolute inset-0"
              style={{
                opacity: swipeRightStrength,
                x: swipeRightOffset,
                background: 'linear-gradient(to left, transparent, rgba(34,197,94,0.15))'
              }}
            />
            <motion.div
              key="swipe-left-feedback"
              className="absolute inset-0"
              style={{
                opacity: swipeLeftStrength,
                x: swipeLeftOffset,
                background: 'linear-gradient(to right, rgba(239,68,68,0.15), transparent)'
              }}
            />
          </AnimatePresence>
        </div>

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
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="50%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          className="relative flex h-full w-full items-center gap-3 overflow-hidden px-3.5"
          style={{
            x: contentResistanceX,
            y: contentResistanceY
          }}
          animate={{
            opacity: openState ? 1 : 0.96
          }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <span
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1',
              iconBubbleToneClasses[tone] || iconBubbleToneClasses.neutral
            )}
          >
            <Icon className="h-4.5 w-4.5" aria-hidden="true" />
          </span>

          <AnimatePresence mode="wait" initial={false}>
            {openState ? (
              <motion.div
                key={`${page?.key || 'page'}-${page?.message || 'ready'}`}
                initial={{ opacity: 0, y: pageDirection > 0 ? 4 : -4, filter: 'blur(2px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: pageDirection > 0 ? -3 : 3, filter: 'blur(2px)' }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="min-w-0 flex-1"
                style={NO_SELECT_STYLE}
              >
                <p className="truncate text-[13px] font-medium leading-none text-white md:text-sm">
                  {text}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="compact-dots"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="min-w-0 flex-1"
              >
                <div className="flex items-center justify-end gap-1.5 pr-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/55" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/35" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {openState ? (
              <motion.span
                key={`${statusMode}-${statusLabel}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[10px] font-medium',
                  chipToneClasses[statusMode] || chipToneClasses.neutral
                )}
                style={NO_SELECT_STYLE}
              >
                <StatusGlyph mode={statusMode} label={statusLabel || 'Ready'} />
              </motion.span>
            ) : (
              <motion.span
                key="compact-chip"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className={cn(
                  'inline-flex h-7 shrink-0 items-center rounded-full px-2.5 text-[10px] font-medium',
                  chipToneClasses.neutral
                )}
                style={NO_SELECT_STYLE}
              >
                <StatusGlyph mode={statusMode} label={statusLabel || 'Ready'} compact />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default AssistantDynamicIsland
