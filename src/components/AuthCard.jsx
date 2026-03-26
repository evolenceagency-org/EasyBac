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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#0a0d1a] to-[#1b0d2a] text-white">
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-purple-500/20 blur-3xl"
          animate={{ y: [0, 30, 0], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-32 h-72 w-72 rounded-full bg-blue-500/18 blur-3xl"
          animate={{ y: [0, -24, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 left-1/3 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-8 md:px-10 md:py-12">
        <div className="grid w-full gap-8 md:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden flex-col justify-center rounded-2xl border border-white/8 bg-gradient-to-br from-white/8 via-white/4 to-transparent p-8 backdrop-blur-lg md:flex">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400" />
            <h2 className="text-2xl font-semibold tracking-tight">{sideTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-white/65">{sideSubtitle}</p>
            <div className="mt-8 grid gap-3 text-xs text-white/60">
              <div className="rounded-xl border border-white/8 bg-white/5 p-3.5">
                Track deep study time and stay consistent until exam day.
              </div>
              <div className="rounded-xl border border-white/8 bg-white/5 p-3.5">
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
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-40" />
            <div className="relative rounded-2xl border border-white/8 bg-white/4 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.2)] backdrop-blur-lg md:p-8">
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

