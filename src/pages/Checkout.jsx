import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthenticatedHomeRoute, isEmailVerified } from '../utils/authFlow.js'
import { getPremiumTrialHoursLeft, hasPremiumAccess, isPremiumTrialActive } from '../utils/subscription.js'
import { isPersonalized } from '../utils/personalization.js'

const premiumDetails = [
  'Instant premium trial access for 48 hours',
  'AI insights and advanced analytics',
  'Priority features unlocked immediately',
  'No blocking while payment review is in progress'
]

const Checkout = () => {
  const navigate = useNavigate()
  const {
    user,
    profile,
    initialized,
    loading,
    profileLoading,
    startPremiumTrialCheckout
  } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const premiumTrialHours = useMemo(
    () => getPremiumTrialHoursLeft(profile),
    [profile]
  )

  useEffect(() => {
    if (!initialized || loading || profileLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!isEmailVerified(user)) {
      navigate('/verify', { replace: true, state: { email: user.email } })
      return
    }

    if (!isPersonalized(profile)) {
      navigate('/personalization', { replace: true })
      return
    }

    if (hasPremiumAccess(profile) && !isPremiumTrialActive(profile)) {
      navigate('/dashboard', { replace: true })
      return
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const handlePayNow = async () => {
    setError('')

    try {
      setSubmitting(true)
      const nextProfile = await startPremiumTrialCheckout()
      const nextRoute =
        isPremiumTrialActive(nextProfile) || nextProfile?.plan === 'premium_trial'
          ? '/payment-pending'
          : getAuthenticatedHomeRoute({ user, profile: nextProfile }) || '/dashboard'

      navigate(nextRoute, { replace: true })
    } catch (checkoutError) {
      setError(
        checkoutError?.message ||
          'We could not start your premium checkout right now. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050507] px-4 pb-12 pt-8 text-white md:px-6 md:pb-16 md:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[600px] flex-col gap-5"
      >
        <button
          type="button"
          onClick={() => navigate('/choose-plan', { replace: true })}
          className="inline-flex w-fit items-center gap-2 text-[13px] text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Premium Checkout</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Unlock Premium
              </h1>
              <p className="mt-3 max-w-md text-sm text-white/70">
                Get instant premium trial access while we review your payment. Your study flow stays fully open.
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Plan Details</p>
              <h2 className="mt-2 text-xl font-semibold">EasyBac Premium</h2>
              <p className="mt-1 text-sm text-white/65">One-time payment with immediate trial access.</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Access</p>
              <p className="mt-2 text-lg font-semibold">48h trial now</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {premiumDetails.map((feature) => (
              <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#c084fc]" />
                <span className="text-sm text-white/78">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-[#8b5cf6]/15 bg-[#8b5cf6]/8 px-4 py-3 text-sm text-white/72">
            Once you tap <span className="font-medium text-white">Pay now</span>, we immediately mark your account as <span className="font-medium text-white">premium trial</span> for 48 hours and move you to the payment review screen.
          </div>

          {premiumTrialHours > 0 ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-white/75">
              <ShieldCheck className="h-3.5 w-3.5 text-[#c084fc]" />
              You already have about {premiumTrialHours}h of premium trial remaining.
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-65"
            >
              {submitting ? 'Processing...' : 'Pay now'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/choose-plan', { replace: true })}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
          </div>
        </section>
      </motion.div>
    </div>
  )
}

export default Checkout
