import { motion } from 'framer-motion'
import { cn } from './cn.js'
import Badge from './Badge.jsx'
import { GhostButton } from './Button.jsx'

const ListItem = ({
  title,
  meta,
  badge,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  trailing,
  className,
  children,
  muted = false
}) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={cn('rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.03]', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'min-w-0 truncate text-[15px] font-semibold',
                muted ? 'text-[#C7D0DC]' : 'text-[#F8FAFC]'
              )}
            >
              {title}
            </h3>
            {badge ? <Badge tone="accent">{badge}</Badge> : null}
          </div>
          {meta ? <p className="mt-1 text-xs text-[#8B96A8]">{meta}</p> : null}
        </div>

        {trailing || actionLabel ? (
          <div className="shrink-0">
            {trailing ? (
              trailing
            ) : (
              <GhostButton className="px-2.5 py-1 text-[11px]" onClick={onAction}>
                {ActionIcon ? <ActionIcon className="mr-1 h-3.5 w-3.5" /> : null}
                {actionLabel}
              </GhostButton>
            )}
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </motion.article>
  )
}

export default ListItem
