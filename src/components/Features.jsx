import { motion } from 'framer-motion'

const features = [
  {
    title: 'Deep Study Tracking',
    description: 'Capture focused hours with live metrics and clean trends.',
    accent: 'from-violet-500/40 to-violet-500/5'
  },
  {
    title: 'Pomodoro Focus',
    description: 'Balance intensity with breaks using adaptive pomodoro flows.',
    accent: 'from-blue-500/40 to-blue-500/5'
  },
  {
    title: 'Productivity Analytics',
    description: 'Track creativity, streaks, and output with simple visuals.',
    accent: 'from-emerald-500/40 to-emerald-500/5'
  },
  {
    title: 'Subject Focus',
    description: 'See weak subjects early and rebalance your weekly plan.',
    accent: 'from-cyan-500/40 to-cyan-500/5'
  },
  {
    title: 'Task Mastery',
    description: 'Convert study goals into actionable, trackable tasks.',
    accent: 'from-fuchsia-500/40 to-fuchsia-500/5'
  },
  {
    title: 'Smart Streaks',
    description: 'Maintain motivation with streak and performance nudges.',
    accent: 'from-amber-500/40 to-amber-500/5'
  }
]

const Features = () => {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Features
          </p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything you need to stay ahead
          </h2>
          <p className="mt-3 text-sm text-zinc-300 sm:text-base">
            Built for modern Bac students who want clarity, structure, and real
            momentum.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.18, delay: index * 0.05 }}
              whileHover={{ scale: 1.02, rotate: 0.2 }}
              className="glass group relative rounded-2xl p-5 shadow-[0_12px_24px_rgba(0,0,0,0.14)] transition hover:border-white/12 hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]"
            >
              <div
                className={`mb-4 h-10 w-10 rounded-full bg-gradient-to-br ${feature.accent}`}
              />
              <h3 className="text-base font-semibold tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {feature.description}
              </p>
              <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_20px_rgba(74,225,118,0.12)]" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features

