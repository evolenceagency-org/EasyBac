import { motion } from 'framer-motion'

const ToggleItem = ({ label, description, checked, onChange, disabled = false, hint = '' }) => {
  return (
    <button
      type="button"
      onClick={() => {
        if (disabled) return
        onChange?.(!checked)
      }}
      disabled={disabled}
      className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition ${
        checked
          ? 'border-[#5B8CFF]/20 bg-[rgba(91,140,255,0.08)]'
          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-white">{label}</p>
          {hint ? (
            <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
              {hint}
            </span>
          ) : null}
        </div>
        {description ? <p className="mt-1 text-xs leading-5 text-white/54">{description}</p> : null}
      </div>
      <div
        className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
          checked
            ? 'border-[#5B8CFF]/20 bg-[#5B8CFF]'
            : 'border-white/[0.06] bg-white/[0.03]'
        }`}
        aria-hidden="true"
      >
        <motion.span
          layout
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm ${
            checked ? 'left-5' : 'left-0.5'
          }`}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  )
}

export default ToggleItem
