import { motion } from 'framer-motion'

const steps = [
  {
    title: 'Create your account',
    description: 'Set your Bac goals and choose the subjects you want to master.'
  },
  {
    title: 'Study with focus',
    description: 'Run deep study or pomodoro sessions while tracking progress.'
  },
  {
    title: 'Track momentum',
    description: 'Watch streaks, subject focus, and productivity evolve daily.'
  },
  {
    title: 'Improve faster',
    description: 'Use AI insights to adjust and stay ahead of the exam.'
  }
]

const HowItWorks = () => {
  return (
    <section id="how" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            Build a routine in minutes
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.18, delay: index * 0.05 }}
              className="glass rounded-2xl p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Step {index + 1}
              </p>
              <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks

