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
          className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl"
          animate={{ y: [0, 30, 0], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute right-0 top-32 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl"
          animate={{ y: [0, -24, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 md:px-12 md:py-16">
        <div className="grid w-full gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-10 backdrop-blur-xl md:flex">
            <div className="mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-400" />
            <h2 className="text-3xl font-semibold">{sideTitle}</h2>
            <p className="mt-4 text-sm text-white/70">{sideSubtitle}</p>
            <div className="mt-10 grid gap-4 text-xs text-white/60">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Track deep study time and stay consistent until exam day.
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                Unlock insights that help you focus on the subjects that matter most.
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative"
          >
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent opacity-40" />
            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-10">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
              <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
              <p className="mt-2 text-sm text-white/70">{subtitle}</p>
              <div className="mt-8">{children}</div>
              {footer && <div className="mt-6 text-sm text-white/70">{footer}</div>}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AuthCard
