import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getPremiumTrialHoursLeft,
  getTrialDaysLeft,
  hasPremiumAccess,
  isPremiumTrialActive,
  normalizeSubscriptionStatus
} from '../utils/subscription.js'

const premiumFeatures = [
  'Instant premium trial access',
  'Unlimited sessions',
  'AI insights',
  'Advanced analytics',
  'Priority support'
]

const Pricing = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const planStatus = useMemo(
    () => normalizeSubscriptionStatus(profile?.subscription_status),
    [profile]
  )

  const premiumActive = hasPremiumAccess(profile)
  const premiumTrialActive = isPremiumTrialActive(profile)
  const trialDaysLeft = getTrialDaysLeft(profile)
  const premiumTrialHoursLeft = getPremiumTrialHoursLeft(profile)

  const handlePremiumClick = () => {
    if (!user) {
      navigate('/register')
      return
    }

    navigate('/checkout')
  }

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="relative px-4 pb-14 pt-8 md:px-12 md:pb-16 md:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mx-auto mt-14 flex w-full max-w-4xl flex-col gap-4 md:mt-20 md:gap-6"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-7">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Premium access, without blocking your study flow
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Start using premium features immediately while we review your payment in the background.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">Current access</p>
              <p className="mt-2 text-3xl font-bold">{premiumActive ? 'Premium active' : 'Free trial'}</p>
              <p className="mt-2 text-sm text-white/70">
                {premiumTrialActive
                  ? `Your premium trial is active for about ${premiumTrialHoursLeft} more hours.`
                  : planStatus === 'trial'
                    ? `You still have ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in your current trial.`
                    : 'Upgrade whenever you are ready. The checkout flow grants instant premium trial access.'}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-5 shadow-[0_0_28px_rgba(139,92,246,0.18)] backdrop-blur-[20px] md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-white/70">Premium</p>
                <span className="rounded-full border border-[#c084fc]/30 bg-[#8b5cf6]/15 px-3 py-1 text-[11px] text-[#eadcff]">
                  Recommended
                </span>
              </div>

              <p className="mt-2 text-2xl font-bold md:text-3xl">Immediate premium trial</p>
              <p className="mt-1 text-sm text-white/70">Tap once, get 48 hours of premium access right away, and let payment review happen quietly in the background.</p>

              <ul className="mt-5 space-y-3">
                {premiumFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-[#d8b4fe]" />
                    {feature}
                  </li>
                ))}
              </ul>

              {premiumActive ? (
                <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {premiumTrialActive ? 'Premium trial already active.' : 'You already have premium access.'}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePremiumClick}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
                >
                  <Sparkles className="h-4 w-4" />
                  Continue to checkout
                </button>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Pricing

