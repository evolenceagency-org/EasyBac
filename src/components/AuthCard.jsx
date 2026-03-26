import { motion } from 'framer-motion'

const AuthCard = ({
  label,
  title,
  subtitle,
  sideTitle,
  sideSubtitle,
  children,
  footer
}) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050507] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_at_20%_0%,rgba(120,100,255,0.08),transparent),radial-gradient(600px_at_80%_100%,rgba(80,60,200,0.06),transparent)]" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-10 md:py-12">
        <div className="grid w-full gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-center rounded-2xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)] p-8 backdrop-blur-[20px] md:flex">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-[#5B8CFF]" />
            <h2 className="text-2xl font-semibold tracking-tight">{sideTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-white/65">{sideSubtitle}</p>
            <div className="mt-8 grid gap-3 text-xs text-white/60">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                Track deep study time and stay consistent until exam day.
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                Unlock insights that help you focus on the subjects that matter most.
              </div>
            </div>
          </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative"
        >
            <div className="relative rounded-2xl border border-white/[0.12] bg-[#0b0b0f] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] md:p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{label}</p>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/65">{subtitle}</p>
              <div className="mt-7">{children}</div>
              {footer && <div className="mt-5 text-sm text-white/65">{footer}</div>}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AuthCard

