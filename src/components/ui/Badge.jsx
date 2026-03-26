import { cn } from './cn.js'

const tones = {
  neutral: 'bg-white/[0.05] text-[#C7D0DC]',
  accent: 'bg-[#5B8CFF]/12 text-[#BFD0FF]',
  success: 'bg-emerald-500/10 text-emerald-200',
  warning: 'bg-amber-500/10 text-amber-200',
  danger: 'bg-rose-500/10 text-rose-200'
}

const Badge = ({ children, tone = 'neutral', className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none',
        tones[tone] || tones.neutral,
        className
      )}
    >
      {children}
    </span>
  )
}

export default Badge

