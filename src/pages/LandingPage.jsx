import { motion } from 'framer-motion'
import { ArrowRight, BrainCircuit, CalendarRange, Sparkles, TimerReset } from 'lucide-react'
import { Link } from 'react-router-dom'

const steps = [
  {
    title: 'Plan',
    description: 'Set your subjects, goal, and exam date in one guided setup.',
    icon: CalendarRange
  },
  {
    title: 'Focus',
    description: 'See the next thing to do and start a session without friction.',
    icon: TimerReset
  },
  {
    title: 'Improve',
    description: 'Let the assistant surface what matters and keep you moving.',
    icon: BrainCircuit
  }
]

const motionProps = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.35 },
  transition: { duration: 0.22, ease: 'easeOut' }
}

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_at_20%_0%,rgba(120,100,255,0.12),transparent),radial-gradient(520px_at_80%_100%,rgba(80,60,200,0.08),transparent)]" />

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-4 pb-12 pt-6 md:px-8 md:pb-16 md:pt-8">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="text-sm font-semibold tracking-[0.16em] text-white/88">
              EasyBac
            </Link>
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm text-white/78 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-[#8b5cf6] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
              >
                Start free
              </Link>
            </div>
          </header>

          <div className="grid gap-10 py-14 md:grid-cols-[1.15fr_0.85fr] md:items-end md:py-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="max-w-2xl"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">Study smarter</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                Study smarter for Bac with AI
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
                EasyBac turns the path from signup to study session into one clear flow: set up, choose a plan, start focusing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
                >
                  I already have an account
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.26, ease: 'easeOut', delay: 0.06 }}
              className="rounded-[2rem] border border-white/[0.08] bg-[#0b0b0f] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-[20px]"
            >
              <div className="rounded-[1.5rem] border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8b5cf6]/12 text-[#d8b4fe]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Assistant</p>
                    <p className="mt-1 text-sm font-medium text-white">Start Math focus now</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Next step</p>
                  <p className="mt-2 text-lg font-semibold text-white">45 min focus block</p>
                  <p className="mt-1 text-sm text-white/65">One calm flow from setup to studying.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <motion.div {...motionProps} className="max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">How it works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Three steps, then you’re in</h2>
        </motion.div>

        <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.article
                key={step.title}
                {...motionProps}
                transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.05 }}
                className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.04] text-[#d8b4fe]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.24em] text-white/45">0{index + 1}</p>
                <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{step.description}</p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 pb-16 md:px-8 md:pb-20">
        <motion.div
          {...motionProps}
          className="rounded-[2rem] border border-white/[0.08] bg-[#0b0b0f] p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
        >
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Start with one clear next step</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65 md:text-base">
            Register, verify your email, answer three setup questions, and land in a dashboard that tells you what to do next.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </div>
  )
}

export default LandingPage

