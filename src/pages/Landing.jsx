import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            BacTracker
          </p>
          <h1 className="text-xl font-semibold">BacTracker</h1>
        </div>
        <Link
          to="/login"
          className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white"
        >
          Login
        </Link>
      </header>

      <main className="px-6 pb-16 pt-8 md:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-semibold leading-tight md:text-5xl"
            >
              A smarter study OS for the Moroccan Bac.
            </motion.h2>
            <p className="mt-6 max-w-xl text-lg text-zinc-300">
              BacTracker helps you plan, focus, and measure progress with live
              sessions, streaks, and productivity analytics.
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
                I already have an account
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Why BacTracker
            </p>
            <h3 className="mt-2 text-2xl font-semibold">Stay consistent</h3>
            <p className="mt-4 text-sm text-zinc-300">
              Keep every study session and task in one space. Understand your
              rhythm, fix weak spots, and get ready for exam day.
            </p>
            <div className="mt-6 grid gap-4 text-sm text-zinc-200">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Track deep study time
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Monitor productivity
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Analyze subject focus
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Maintain study streaks
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Prepare efficiently for the Bac exam
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Plan your workload',
              body: 'Organize tasks by subject and due date so you always know the next move.'
            },
            {
              title: 'Focus with intent',
              body: 'Free study and Pomodoro modes keep your sessions structured.'
            },
            {
              title: 'Stay ahead',
              body: 'Track streaks, analytics, and progress from one dashboard.'
            }
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <h4 className="text-lg font-semibold">{item.title}</h4>
              <p className="mt-3 text-sm text-zinc-300">{item.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

export default Landing
