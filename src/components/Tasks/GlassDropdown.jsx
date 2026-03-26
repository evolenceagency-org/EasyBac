import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const GlassDropdown = ({ value, options, onChange, placeholder, disabled }) => {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const ref = useRef(null)
  const menuRef = useRef(null)

  const selected = options.find((opt) => opt.value === value)

  useEffect(() => {
    const handleClick = (event) => {
      if (!ref.current) return
      if (ref.current.contains(event.target)) return
      if (menuRef.current?.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [])

  useLayoutEffect(() => {
    if (!open || !ref.current) return
    const updatePosition = () => {
      const rect = ref.current.getBoundingClientRect()
      const viewportPadding = 12
      const menuOffset = 8
      const itemHeight = 36
      const estimatedHeight = Math.min(options.length * itemHeight + 8, 280)
      const minWidth = 180
      const width = Math.max(rect.width, minWidth)
      const maxLeft = window.innerWidth - width - viewportPadding
      const left = Math.min(Math.max(rect.left, viewportPadding), maxLeft)
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
      const spaceAbove = rect.top - viewportPadding
      const openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
      const maxHeight = Math.max(
        120,
        Math.floor((openUp ? spaceAbove : spaceBelow) - menuOffset)
      )
      const menuHeight = Math.min(estimatedHeight, maxHeight)
      const top = openUp
        ? Math.max(viewportPadding, rect.top - menuHeight - menuOffset)
        : rect.bottom + menuOffset

      setMenuStyle({
        top,
        left,
        width,
        maxHeight,
        transformOrigin: openUp ? 'bottom center' : 'top center'
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
          'flex w-full items-center justify-between gap-2 rounded-lg border border-white/8 bg-white/4 px-3.5 py-2.5 text-[13px] text-white/78 backdrop-blur-md transition-all duration-200 ease-out md:py-2',
          'hover:border-white/12 hover:bg-white/6',
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
              ref={menuRef}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={menuStyle}
              className="fixed z-[120] max-h-60 overflow-y-auto rounded-xl border border-white/8 bg-neutral-950/96 backdrop-blur-xl shadow-[0_12px_24px_rgba(0,0,0,0.32)]"
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                    className={cn(
                      'w-full px-4 py-2 text-left text-[13px] text-white/78 transition hover:bg-white/8',
                      value === option.value &&
                        'bg-gradient-to-r from-purple-500/18 to-blue-500/18 text-white'
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

