import { motion } from 'framer-motion'
import { cn } from './cn.js'

const SegmentedControl = ({ options, value, onChange, className }) => {
  return (
    <div className={cn('inline-flex rounded-full bg-white/[0.04] p-1 text-xs text-[#C7D0DC]', className)}>
      {options.map((option) => {
        const active = value === option.value
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="relative rounded-full px-3 py-1.5 font-medium"
          >
            {active && (
              <motion.span
                layoutId="segmented-control-active"
                className="absolute inset-0 rounded-full bg-white/[0.08]"
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default SegmentedControl

