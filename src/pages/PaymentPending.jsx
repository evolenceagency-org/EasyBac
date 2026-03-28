import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getPremiumTrialHoursLeft, hasPremiumAccess, isPremiumTrialActive } from '../utils/subscription.js'

const PaymentPending = () => {
  const navigate = useNavigate()
  const { user, profile, initialized, loading, profileLoading } = useAuth()

  useEffect(() => {
    if (!initialized || loading || profileLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!isPremiumTrialActive(profile) && !hasPremiumAccess(profile)) {
      navigate('/checkout', { replace: true })
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const hoursLeft = getPremiumTrialHoursLeft(profile)

  return (
    <div className="min-h-screen bg-[#050507] px-4 pb-12 pt-8 text-white md:px-6 md:pb-16 md:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mx-auto flex w-full max-w-[600px] flex-col gap-5"
      >
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[20px]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Payment received</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              We are reviewing your payment
            </h1>
            <p className="mt-3 text-sm text-white/70">
              Your payment is in review. This usually takes less than 12 hours.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#c084fc]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Premium trial is already active</h2>
              <p className="mt-1 text-sm text-white/70">
                You can keep using premium features right away while we complete the review.
              </p>
              {hoursLeft > 0 ? (
                <p className="mt-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/78">
                  About {hoursLeft}h of premium trial remaining
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            Go to dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/checkout', { replace: true })}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
          >
            Back to checkout
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default PaymentPending
