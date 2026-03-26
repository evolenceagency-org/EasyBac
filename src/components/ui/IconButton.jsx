import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from './cn.js'

const IconButton = forwardRef(function IconButton({ className, children, ...props }, ref) {
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className={cn(
        'surface-subtle inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.03] text-[#C7D0DC] transition hover:border-[rgba(139,92,246,0.5)] hover:bg-white/[0.05] hover:text-[#F8FAFC]',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
})

export default IconButton
