import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const sectionMotion = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 }
}

const features = [
  { title: 'Deep Study Tracking', desc: 'Log focused sessions and keep momentum.' },
  { title: 'Pomodoro Timer', desc: 'Structured focus blocks that build consistency.' },
  { title: 'Productivity Analytics', desc: 'Visualize trends and improve weekly output.' },
  { title: 'Subject Focus', desc: 'See how your time is distributed by subject.' },
  { title: 'Streak System', desc: 'Stay motivated with smart streak tracking.' }
]

const steps = [
  { step: '1', title: 'Create account', desc: 'Start in seconds with a free trial.' },
  { step: '2', title: 'Study daily', desc: 'Use deep focus sessions or pomodoro mode.' },
  { step: '3', title: 'Track progress', desc: 'Monitor your time and productivity.' },
  { step: '4', title: 'Improve performance', desc: 'Adjust your plan based on real data.' }
]

const faqs = [
  { q: 'Is it free?', a: 'Yes, you get a 3-day free trial.' },
  { q: 'Do I need payment?', a: 'After the trial ends, you can upgrade.' },
  { q: 'Does it work on phone?', a: 'Yes, the app is fully responsive.' }
]

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <main className="px-6 pb-20 pt-12 md:px-12">
        <motion.section
          variants={sectionMotion}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.5 }}
          className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              BacTracker
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">
              Track Your Bac Progress Like a Pro
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-300">
              Measure your study time, track productivity, and stay consistent
              until exam day.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900"
              >
                Start Free Trial
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
              >
                Login
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                Today
              </p>
              <p className="mt-3 text-2xl font-semibold">2h 15m Focused</p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-2 w-2/3 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                Streak
              </p>
              <p className="mt-3 text-2xl font-semibold">6 days</p>
              <p className="mt-2 text-sm text-zinc-300">
                Keep the streak alive this week.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-semibold">Features built for focus</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                whileHover={{ y: -6 }}
                className="glass rounded-2xl p-5"
              >
                <div className="h-10 w-10 rounded-xl bg-white/10" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-semibold">App preview</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {['Dashboard', 'Charts', 'Tasks'].map((label) => (
              <div key={label} className="glass rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  {label}
                </p>
                <div className="mt-4 space-y-3">
                  <div className="h-3 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-full rounded bg-white/10" />
                  <div className="h-24 w-full rounded-xl bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="glass rounded-2xl p-5">
                <div className="text-sm font-semibold text-emerald-300">
                  Step {item.step}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((item) => (
              <div key={item.q} className="glass rounded-2xl p-5">
                <p className="text-sm font-semibold">{item.q}</p>
                <p className="mt-2 text-sm text-zinc-300">{item.a}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={sectionMotion}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="mt-20"
        >
          <div className="glass rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-semibold">
              Start your free trial now
            </h2>
            <p className="mt-3 text-sm text-zinc-300">
              Join Bac students who want to study with clarity and momentum.
            </p>
            <Link
              to="/register"
              className="mt-6 inline-flex rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900"
            >
              Start Free Trial
            </Link>
          </div>
        </motion.section>
      </main>
    </div>
  )
}

export default Landing
