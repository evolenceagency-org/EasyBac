import { motion } from 'framer-motion'
import { cn } from './cn.js'
import Badge from './Badge.jsx'

const SectionBlock = ({
  title,
  description,
  eyebrow,
  badge,
  children,
  className,
  actions,
  compact = false
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'surface-subtle rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-[20px]',
        compact ? 'p-3' : 'p-4 md:p-5',
        className
      )}
    >
      {(title || description || eyebrow || badge || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#8B96A8]">{eyebrow}</p>
            ) : null}
            {title ? <h2 className="mt-1 text-[15px] font-semibold text-[#F8FAFC]">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[#C7D0DC]">{description}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge ? <Badge tone="neutral">{badge}</Badge> : null}
            {actions}
          </div>
        </div>
      )}
      {children ? <div className={cn(title || description || eyebrow || badge || actions ? 'mt-4' : '')}>{children}</div> : null}
    </motion.section>
  )
}

export default SectionBlock
