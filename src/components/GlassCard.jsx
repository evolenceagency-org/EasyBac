import { motion } from 'framer-motion'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const GlassCard = ({ children, className, hover = true }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02 } : undefined}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-xl',
        'border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.1)]',
        'transition-all duration-300 ease-out',
        hover && 'hover:border-purple-400/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]',
        className
      )}
    >
      {children}
    </motion.div>
  )
}

export default GlassCard
