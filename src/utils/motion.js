export const MOTION = {
  fast: 0.12,
  normal: 0.15,
  slow: 0.18,
  easeOut: [0.16, 1, 0.3, 1]
}

export const motionPresets = {
  fadeSlide: ({ distance = 4, duration = MOTION.normal } = {}) => ({
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: distance * -0.5 },
    transition: { duration, ease: MOTION.easeOut }
  }),
  panel: ({ scale = 0.98, duration = MOTION.slow } = {}) => ({
    initial: { opacity: 0, y: 6, scale },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 6, scale },
    transition: { duration, ease: MOTION.easeOut }
  }),
  tap: {
    whileTap: { scale: 0.97 },
    transition: { duration: MOTION.fast, ease: MOTION.easeOut }
  },
  subtleHover: {
    whileHover: { backgroundColor: 'rgba(255,255,255,0.03)' },
    transition: { duration: MOTION.fast, ease: MOTION.easeOut }
  }
}

export const gestureMotion = {
  swipeThreshold: 40,
  swipeMax: 80,
  swipeVelocityThreshold: 0.45,
  dragCloseThreshold: 64,
  dragCloseVelocity: 850,
  reorderDelay: 280,
  dragScale: 1.02,
  dragShadow: '0 10px 24px rgba(0,0,0,0.18)'
}

export const quickSpring = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.72
}

export const panelSpring = {
  type: 'spring',
  stiffness: 260,
  damping: 28,
  mass: 0.84
}
