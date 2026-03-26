import GlassCard from '../GlassCard.jsx'

const SectionCard = ({ title, description, eyebrow, badge, children, className = '' }) => {
  return (
    <GlassCard className={`p-4 md:p-5 ${className}`} hover={false}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 text-base font-semibold tracking-tight text-white md:text-lg">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-white/62">{description}</p> : null}
        </div>
        {badge ? (
          <div className="shrink-0 rounded-full border border-white/8 bg-white/4 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </GlassCard>
  )
}

export default SectionCard
