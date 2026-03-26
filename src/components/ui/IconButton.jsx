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
        'inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.04] text-[#C7D0DC] transition hover:bg-white/[0.06] hover:text-[#F8FAFC]',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
})

export default IconButton
