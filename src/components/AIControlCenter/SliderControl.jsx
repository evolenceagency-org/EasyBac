const labels = ['Low', 'Medium', 'High']

const SliderControl = ({ value, onChange, label = 'Autonomy Level', description }) => {
  const safeValue = Math.min(2, Math.max(0, Number(value) || 0))
  const percent = (safeValue / 2) * 100

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-[20px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium text-white">{label}</p>
          {description ? <p className="mt-1 text-xs leading-5 text-white/54">{description}</p> : null}
        </div>
        <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-white/68">
          {labels[safeValue]}
        </div>
      </div>

      <div className="mt-4">
        <div className="relative h-2 rounded-full bg-white/[0.05]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#5B8CFF]"
            style={{ width: `${percent}%` }}
          />
          <input
            type="range"
            min="0"
            max="2"
            step="1"
            value={safeValue}
            onChange={(event) => onChange?.(Number(event.target.value))}
            className="absolute inset-0 h-2 w-full cursor-pointer appearance-none bg-transparent opacity-0"
            aria-label={label}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
          {labels.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SliderControl
