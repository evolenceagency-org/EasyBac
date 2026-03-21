import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const GlassDropdown = ({ value, options, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const ref = useRef(null)

  const selected = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClick = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const updatePosition = () => {
      const rect = ref.current.getBoundingClientRect()
      const minWidth = 180
      const width = Math.max(rect.width, minWidth)
      const maxLeft = window.innerWidth - width - 12
      const left = Math.min(Math.max(rect.left, 12), maxLeft)
      setMenuStyle({
        top: rect.bottom + 8,
        left,
        width
      })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-md transition-all duration-300 ease-out',
          'hover:border-purple-400/40 hover:shadow-[0_0_10px_rgba(139,92,246,0.2)]',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <span className="truncate">
          {selected?.label || placeholder || 'Select'}
        </span>
        <ChevronDown className="h-4 w-4 text-white/60" />
      </button>

      {open &&
        !disabled &&
        menuStyle &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={menuStyle}
              className="fixed z-50 overflow-hidden rounded-lg border border-white/10 bg-black/90 backdrop-blur-xl shadow-[0_0_25px_rgba(139,92,246,0.25)]"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm text-white/80 transition hover:bg-white/10',
                    value === option.value &&
                      'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
    </div>
  )
}

export default GlassDropdown
