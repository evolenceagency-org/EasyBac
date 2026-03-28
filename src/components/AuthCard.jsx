import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

const AuthCard = ({
  label,
  title,
  subtitle,
  sideTitle,
  sideSubtitle,
  sideEyebrow,
  supportPoints = [],
  backTo,
  backLabel = 'Back',
  progressText,
  children,
  footer
}) => {
  const points =
    supportPoints.length > 0
      ? supportPoints
      : ['One clear action per screen.', 'Fast routing into the next required step.']

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_at_20%_0%,rgba(120,100,255,0.08),transparent),radial-gradient(600px_at_80%_100%,rgba(80,60,200,0.06),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1040px] items-center px-4 py-8 md:px-8 md:py-12">
        <div className="flex w-full flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            {backTo ? (
              <Link
                to={backTo}
                className="inline-flex items-center gap-2 text-[13px] text-white/60 transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {backLabel}
              </Link>
            ) : (
              <div className="text-sm font-semibold tracking-[0.16em] text-white/88">EasyBac</div>
            )}

            {progressText ? (
              <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-white/50">
                {progressText}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[20px] md:p-7">
            <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">{label}</p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">{subtitle}</p>
          </div>

          <div className="grid gap-5 md:grid-cols-[0.84fr_1.16fr]">
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                {sideEyebrow || 'Flow'}
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">{sideTitle}</h2>
              <p className="mt-3 text-sm leading-6 text-white/65">{sideSubtitle}</p>
              <div className="mt-6 space-y-3">
                {points.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-white/68"
                  >
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative"
            >
              <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-7">
                <div>{children}</div>
                {footer ? <div className="mt-5 text-sm text-white/65">{footer}</div> : null}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthCard
