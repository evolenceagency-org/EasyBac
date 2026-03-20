import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <div className="px-6 pb-16 pt-12 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="text-2xl font-semibold">Pricing</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Start free and upgrade when you are ready.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                Free Trial
              </p>
              <p className="mt-3 text-2xl font-semibold">3 Days</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                <li>Deep study tracking</li>
                <li>Pomodoro timer</li>
                <li>Basic analytics</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                Premium
              </p>
              <p className="mt-3 text-2xl font-semibold">Full Access</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-100">
                <li>Unlimited study sessions</li>
                <li>Advanced analytics</li>
                <li>Subject focus insights</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-900"
            >
              Start Free Trial
            </Link>
            <Link
              to="/payment"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white"
            >
              Upgrade Now
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing
