import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CheckCircle2, Star } from 'lucide-react'

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="px-6 pb-16 pt-12 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto mt-20 flex w-full max-w-4xl flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-xl"
        >
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Pricing</p>
            <h1 className="mt-2 text-3xl font-semibold">
              Upgrade to unlock premium focus
            </h1>
            <p className="mt-2 text-sm text-white/70">
              Your free trial is already active. Upgrade anytime for full access.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-xs uppercase tracking-wide text-white/70">
                Free Trial
              </p>
              <p className="mt-3 text-3xl font-semibold">3 Days</p>
              <p className="mt-1 text-sm text-white/60">
                Explore the essentials
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white/70" />
                  Deep study tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white/70" />
                  Pomodoro timer
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-white/70" />
                  Basic analytics
                </li>
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-6 shadow-[0_0_40px_rgba(139,92,246,0.25)]"
            >
              <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                <Star className="h-3 w-3 text-purple-200" />
                Recommended
              </span>
              <p className="text-xs uppercase tracking-wide text-white/80">
                Premium
              </p>
              <p className="mt-3 text-3xl font-semibold">299 MAD</p>
              <p className="mt-1 text-sm text-white/70">
                Full access for serious progress
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-200" />
                  Unlimited sessions
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-200" />
                  Advanced analytics
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-200" />
                  AI insights
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-200" />
                  Subject tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-200" />
                  Priority support
                </li>
              </ul>
            </motion.div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/contact"
              className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] transition hover:shadow-[0_0_30px_rgba(139,92,246,0.6)]"
            >
              Contact to Upgrade
            </Link>
          </div>

          <p className="text-xs text-white/70">
            Manual activation after payment confirmation.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing
