import { motion } from 'framer-motion'
import { cn } from './ui/cn.js'

const GlassCard = ({ children, className, hover = true }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.005, y: -1 } : undefined}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-xl bg-white/[0.03] backdrop-blur-sm',
        'ring-1 ring-white/[0.04]',
        'transition-colors duration-150 ease-out',
        hover && 'hover:bg-white/[0.04]',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export default GlassCard
