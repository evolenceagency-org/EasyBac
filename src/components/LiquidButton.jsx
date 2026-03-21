import { motion } from 'framer-motion'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const variants = {
  primary: {
    base: 'bg-white/10 border-white/25 shadow-white/15',
    glow: 'from-violet-500/35 via-blue-500/30 to-cyan-400/25',
    ring: 'hover:shadow-[0_0_30px_rgba(99,102,241,0.35)]'
  },
  secondary: {
    base: 'bg-white/8 border-white/20 shadow-white/10',
    glow: 'from-violet-500/20 via-blue-500/18 to-cyan-400/15',
    ring: 'hover:shadow-[0_0_22px_rgba(99,102,241,0.25)]'
  },
  ghost: {
    base: 'bg-white/5 border-white/15 shadow-white/5',
    glow: 'from-violet-500/12 via-blue-500/10 to-cyan-400/8',
    ring: 'hover:shadow-[0_0_16px_rgba(148,163,184,0.25)]'
  }
}

const LiquidButton = ({
  children,
  variant = 'primary',
  onClick,
  className,
  type = 'button',
  ...props
}) => {
  const styles = variants[variant] || variants.primary

  return (
    <motion.button
      type={type}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-6 py-3 text-sm font-medium tracking-wide text-white',
        'backdrop-blur-xl border',
        'shadow-lg',
        'transition-all duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        'active:shadow-none',
        styles.base,
        styles.ring,
        className
      )}
      style={{
        filter: 'url(#liquid-glass-filter)'
      }}
      {...props}
    >
      {/* SVG filter (optional distortion). Safe fallback if unsupported */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0"
      >
        <filter id="liquid-glass-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="1"
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" />
        </filter>
      </svg>

      {/* Gradient glow layer */}
      <span
        className={cn(
          'absolute inset-0 -z-10 opacity-60 blur-2xl',
          'bg-gradient-to-r',
          styles.glow
        )}
      />

      {/* Glass base */}
      <span className="absolute inset-0 -z-20 rounded-2xl bg-white/5" />

      {/* Light reflection */}
      <span className="pointer-events-none absolute inset-x-2 top-1 h-1/3 rounded-2xl bg-gradient-to-b from-white/40 via-white/10 to-transparent opacity-60" />
      <span className="pointer-events-none absolute inset-x-4 bottom-1 h-1/3 rounded-2xl bg-gradient-to-t from-white/10 to-transparent opacity-40" />

      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

export default LiquidButton
