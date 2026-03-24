import GlassCard from '../GlassCard.jsx'

const SectionCard = ({ title, description, eyebrow, badge, children, className = '' }) => {
  return (
    <GlassCard className={`p-5 md:p-6 ${className}`} hover={false}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 text-lg font-semibold text-white md:text-xl">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-white/68">{description}</p> : null}
        </div>
        {badge ? (
          <div className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/70">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </GlassCard>
  )
}

export default SectionCard
