import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from './cn.js'

const base =
  'inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5B8CFF]/30 disabled:cursor-not-allowed disabled:opacity-50'

const variants = {
  primary: 'bg-[#5B8CFF] text-white hover:bg-[#4E7EEA]',
  secondary:
    'bg-white/[0.04] text-[#F8FAFC] ring-1 ring-white/[0.06] hover:bg-white/[0.06]',
  ghost: 'bg-transparent text-[#C7D0DC] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
}

const makeButton = (variant) =>
  forwardRef(function UIBlockButton({ className, children, type = 'button', ...props }, ref) {
    return (
      <motion.button
        ref={ref}
        type={type}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className={cn(base, variants[variant], className)}
        {...props}
      >
        {children}
      </motion.button>
    )
  })

export const PrimaryButton = makeButton('primary')
export const SecondaryButton = makeButton('secondary')
export const GhostButton = makeButton('ghost')

export default PrimaryButton

