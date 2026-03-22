import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

function getRemainingDays(date) {
  const now = new Date()
  const end = new Date(date)
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

const freeFeatures = ['Basic tracking', 'Limited sessions', 'Pomodoro timer']

const premiumFeatures = [
  'Unlimited sessions',
  'AI insights',
  'Advanced analytics',
  'Subject tracking',
  'Priority support'
]

const Pricing = () => {
  const { profile } = useAuth()

  const user = useMemo(() => {
    if (!profile) {
      return {
        plan: 'free',
        trialEndsAt: ''
      }
    }

    if (
      profile.payment_verified ||
      profile.subscription_status === 'premium' ||
      profile.subscription_status === 'active'
    ) {
      return {
        plan: 'premium',
        trialEndsAt: ''
      }
    }

    if (profile.subscription_status === 'trial' && profile.trial_start) {
      const trialEnd = new Date(profile.trial_start)
      trialEnd.setDate(trialEnd.getDate() + 3)
      return {
        plan: 'trial',
        trialEndsAt: trialEnd.toISOString()
      }
    }

    return {
      plan: 'free',
      trialEndsAt: ''
    }
  }, [profile])

  const trialDaysLeft = user.plan === 'trial' ? getRemainingDays(user.trialEndsAt) : 0

  const statusText = useMemo(() => {
    if (user.plan === 'premium') return 'You already have full access'
    if (user.plan === 'trial') return `Trial active - ${trialDaysLeft} days left`
    return ''
  }, [user.plan, trialDaysLeft])

  const ctaLabel = user.plan === 'trial' ? 'Upgrade before trial ends' : 'Unlock Full Access ->'

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="relative px-6 pb-16 pt-12 md:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.14),transparent_32%)]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mx-auto mt-20 flex w-full max-w-4xl flex-col gap-6"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Focus. Track. Improve. Succeed in your Bac.
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Everything you need to stay consistent until exam day.
            </p>
            <span className="mt-5 block h-[2px] w-40 bg-gradient-to-r from-purple-500 to-blue-500" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">Free / Trial</p>
              <p className="mt-2 text-3xl font-bold">3 Days Trial</p>
              <ul className="mt-5 space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/75">
                    <CheckCircle2 className="h-4 w-4 text-white/60" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-6 shadow-[0_0_40px_rgba(139,92,246,0.25)] backdrop-blur-xl"
            >
              <div className="absolute right-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-300/25 bg-purple-500/20 px-3 py-1 text-xs text-purple-100">
                  Recommended
                </span>
                <span className="rounded-full border border-amber-300/25 bg-amber-500/20 px-3 py-1 text-xs text-amber-100">
                  Limited offer
                </span>
                <span className="rounded-full border border-red-300/25 bg-red-500/20 px-3 py-1 text-xs text-red-100">
                  Price will increase soon
                </span>
              </div>

              <p className="pt-12 text-xs uppercase tracking-wide text-white/70">Premium</p>
              <p className="mt-2 text-3xl font-bold">299 MAD - Full access until exam</p>
              <p className="mt-1 text-sm text-white/70">One-time payment</p>

              <ul className="mt-5 space-y-3">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-purple-200" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
            {statusText && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/85">
                <Sparkles className="h-4 w-4 text-purple-300" />
                {statusText}
              </p>
            )}

            {user.plan !== 'premium' && (
              <Link
                to="/payment"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.45)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(139,92,246,0.6)]"
              >
                {ctaLabel}
              </Link>
            )}

            <p className="mt-3 text-xs text-white/70">
              Manual activation after payment confirmation
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing
