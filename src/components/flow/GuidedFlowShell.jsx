import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const steps = [
  { id: 1, label: 'Personalize' },
  { id: 2, label: 'Choose plan' },
  { id: 3, label: 'Checkout' }
]

const GuidedFlowShell = ({
  step = 1,
  eyebrow,
  title,
  description,
  onBack,
  backLabel = 'Back',
  children
}) => {
  const normalizedStep = Math.min(3, Math.max(1, step))

  return (
    <div className="min-h-screen bg-[#050507] px-4 pb-12 pt-8 text-white md:px-6 md:pb-16 md:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[680px] flex-col gap-5"
      >
        <div className="flex items-center justify-between gap-4">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-[13px] text-white/60 transition hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
          ) : (
            <span />
          )}

          <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/50">
            Step {normalizedStep} / 3
          </div>
        </div>

        <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[20px] md:p-7">
          <div className="flex items-center gap-2">
            {steps.map((item) => {
              const active = item.id === normalizedStep
              const completed = item.id < normalizedStep
              return (
                <div key={item.id} className="flex flex-1 items-center gap-2">
                  <div
                    className={`h-2 flex-1 rounded-full transition ${
                      completed || active ? 'bg-[#8b5cf6]' : 'bg-white/[0.08]'
                    }`}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-5">
            {eyebrow ? (
              <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">{eyebrow}</p>
            ) : null}
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">{description}</p>
            ) : null}
          </div>
        </section>

        {children}
      </motion.div>
    </div>
  )
}

export default GuidedFlowShell
