import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

const AmountSelector = ({ amount, onChange, presets = [10, 20, 50, 100, 200] }) => {
  const [customValue, setCustomValue] = useState(amount ? String(amount) : '')
  const inputRef = useRef(null)

  useEffect(() => {
    setCustomValue(amount ? String(amount) : '')
  }, [amount])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handlePresetClick = (value) => {
    onChange(value)
    setCustomValue(String(value))
  }

  const handleCustomChange = (event) => {
    const nextValue = event.target.value.replace(/[^\d]/g, '')
    setCustomValue(nextValue)
    const parsed = Number(nextValue)
    onChange(Number.isFinite(parsed) ? parsed : 0)
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {presets.map((preset) => {
          const isActive = amount === preset
          return (
            <motion.button
              key={preset}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handlePresetClick(preset)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-300 ${
                isActive
                  ? 'border-purple-400/60 bg-gradient-to-r from-purple-500/25 to-blue-500/25 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)]'
                  : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {preset} MAD
            </motion.button>
          )
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-md transition-all duration-300 focus-within:border-purple-400/40 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.25)]">
        <label className="text-xs uppercase tracking-[0.22em] text-white/50">
          Custom amount
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            placeholder="Enter amount"
            value={customValue}
            onChange={handleCustomChange}
            className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-white/30 focus:outline-none"
          />
          <span className="text-sm text-white/50">MAD</span>
        </div>
      </div>
    </div>
  )
}

export default AmountSelector
