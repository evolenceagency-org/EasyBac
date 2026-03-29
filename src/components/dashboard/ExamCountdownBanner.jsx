import { CalendarDays, ChevronRight } from 'lucide-react'

const ExamCountdownBanner = ({ countdown, onManageDate, className = '' }) => {
  if (!countdown) {
    return (
      <section
        className={`rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] ${className}`.trim()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Exam countdown</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Add your exam date</h2>
            <p className="mt-2 text-sm text-white/65">
              Set the date once and we will keep every page anchored to the same timeline.
            </p>
          </div>
          {onManageDate ? (
            <button
              type="button"
              onClick={onManageDate}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.06]"
            >
              Add date
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </section>
    )
  }

  const toneClass =
    countdown.urgency === 'high'
      ? 'from-amber-400/20 to-orange-400/10 border-amber-400/20'
      : countdown.urgency === 'medium'
        ? 'from-[#8b5cf6]/18 to-[#6366f1]/10 border-[#8b5cf6]/18'
        : 'from-white/[0.05] to-white/[0.02] border-white/[0.08]'

  const progressClass =
    countdown.urgency === 'high'
      ? 'bg-gradient-to-r from-amber-400 to-orange-400'
      : countdown.urgency === 'medium'
        ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6366f1]'
        : 'bg-white/65'

  return (
    <section
      className={`rounded-3xl border bg-gradient-to-br p-5 backdrop-blur-[20px] ${toneClass} ${className}`.trim()}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Exam countdown</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {countdown.daysLeft} day{countdown.daysLeft === 1 ? '' : 's'} left
          </h2>
          <p className="mt-2 text-sm text-white/65">Target date: {countdown.formattedDate}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-[#d8b4fe]">
          <CalendarDays className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 h-2 rounded-full bg-white/[0.08]">
        <div
          className={`h-2 rounded-full transition-all ${progressClass}`}
          style={{ width: `${countdown.progress}%` }}
        />
      </div>
    </section>
  )
}

export default ExamCountdownBanner
