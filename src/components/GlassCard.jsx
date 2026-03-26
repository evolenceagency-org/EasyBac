import { motion } from 'framer-motion'
import { cn } from './ui/cn.js'

const GlassCard = ({ children, className, hover = true, elevated = false }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.002, y: -0.5 } : undefined}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl text-white backdrop-blur-[20px] transition-colors duration-150 ease-out',
        elevated
          ? 'surface-elevated border border-white/[0.12] bg-[#0b0b0f] shadow-[0_10px_30px_rgba(0,0,0,0.25)]'
          : 'surface-subtle border border-white/[0.06] bg-white/[0.03] shadow-none',
        hover && 'hover:border-[rgba(139,92,246,0.5)] hover:bg-white/[0.04] hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2)]',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export default GlassCard
