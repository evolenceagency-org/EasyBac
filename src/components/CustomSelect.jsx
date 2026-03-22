import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  className = ''
}) => {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const optionRefs = useRef([])

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  )

  const closeMenu = () => setOpen(false)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        closeMenu()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!open) return
    const selectedIndex = options.findIndex((option) => option.value === value)
    const fallbackIndex = selectedIndex >= 0 ? selectedIndex : 0
    optionRefs.current[fallbackIndex]?.focus()
  }, [open, options, value])

  const selectValue = (nextValue) => {
    onChange(nextValue)
    closeMenu()
    triggerRef.current?.focus()
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setOpen((prev) => !prev)
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
    if (event.key === 'Escape') {
      closeMenu()
    }
  }

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectValue(options[index].value)
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = (index + 1) % options.length
      optionRefs.current[nextIndex]?.focus()
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const prevIndex = (index - 1 + options.length) % options.length
      optionRefs.current[prevIndex]?.focus()
    }
  }

  return (
    <div className={`relative z-20 overflow-visible ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-white backdrop-blur-md transition-all duration-200 ease-out hover:border-white/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_12px_rgba(139,92,246,0.12)] focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      >
        <span className={`${selectedOption ? 'text-white' : 'text-white/45'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-white/70 transition-transform duration-200 ${
            open ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-white/10 bg-[rgba(20,20,30,0.95)] py-2 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl"
            role="listbox"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  ref={(node) => {
                    optionRefs.current[index] = node
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectValue(option.value)}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  className={`block w-full cursor-pointer px-4 py-2 text-left text-sm transition-all duration-150 ${
                    isSelected
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-300 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-indigo-500/10 hover:text-white'
                  } ${index === 0 ? 'rounded-t-xl' : ''} ${
                    index === options.length - 1 ? 'rounded-b-xl' : ''
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CustomSelect
