import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getTrialDaysLeft, normalizeSubscriptionStatus } from '../utils/subscription.js'

const premiumFeatures = [
  'Unlimited sessions',
  'AI insights',
  'Advanced analytics',
  'Subject tracking',
  'Priority support'
]

const Pricing = () => {
  const { user, profile, initialized, loading } = useAuth()
  const navigate = useNavigate()

  const planStatus = useMemo(
    () => normalizeSubscriptionStatus(profile?.subscription_status),
    [profile]
  )

  const isPremium = Boolean(profile?.payment_verified || planStatus === 'premium')
  const isTrial = planStatus === 'trial'
  const trialDaysLeft = getTrialDaysLeft(profile)

  useEffect(() => {
    if (!initialized || loading) return
    if (!user || !profile) return
    if (planStatus === 'free' && !profile.payment_verified) {
      navigate('/choose-plan', { replace: true })
    }
  }, [initialized, loading, user, profile, planStatus, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="relative px-4 pb-14 pt-8 md:px-12 md:pb-16 md:pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.14),transparent_32%)]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mx-auto mt-14 flex w-full max-w-4xl flex-col gap-4 md:mt-20 md:gap-6"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:p-7">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Focus. Track. Improve. Succeed in your Bac.
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Everything you need to stay consistent until exam day.
            </p>
            <span className="mt-5 block h-[2px] w-40 bg-gradient-to-r from-purple-500 to-blue-500" />
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:p-6"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">Trial Plan</p>
              <p className="mt-2 text-3xl font-bold">3 Days Trial</p>
              <p className="mt-2 text-sm text-white/70">
                Basic tracking, limited sessions, pomodoro timer.
              </p>
              {isTrial && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/85">
                  <Sparkles className="h-4 w-4 text-purple-300" />
                  Trial active - {trialDaysLeft} days left
                </p>
              )}
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-5 shadow-[0_0_40px_rgba(139,92,246,0.25)] backdrop-blur-xl md:p-6"
            >
              <div className="absolute right-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-300/25 bg-purple-500/20 px-3 py-1 text-xs text-purple-100">
                  Recommended
                </span>
                <span className="hidden rounded-full border border-amber-300/25 bg-amber-500/20 px-3 py-1 text-xs text-amber-100 sm:inline-flex">
                  Limited offer
                </span>
                <span className="hidden rounded-full border border-red-300/25 bg-red-500/20 px-3 py-1 text-xs text-red-100 lg:inline-flex">
                  Price will increase soon
                </span>
              </div>

              <p className="pt-12 text-xs uppercase tracking-wide text-white/70">Premium</p>
              <p className="mt-2 text-2xl font-bold md:text-3xl">299 MAD - Full access until exam</p>
              <p className="mt-1 text-sm text-white/70">One-time payment</p>

              <ul className="mt-5 space-y-3">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-purple-200" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isPremium ? (
                <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  You already have Premium access.
                </div>
              ) : isTrial ? (
                <button
                  type="button"
                  onClick={() => navigate('/payment')}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.45)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(139,92,246,0.6)]"
                >
                  Get Premium
                </button>
              ) : null}
            </motion.div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:p-6">
            <p className="mt-1 text-xs text-white/70">
              Manual activation after payment confirmation
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing

