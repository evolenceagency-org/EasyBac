import { useEffect } from 'react'
import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GuidedFlowShell from '../components/flow/GuidedFlowShell.jsx'
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
      navigate('/payment', { replace: true })
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const hoursLeft = getPremiumTrialHoursLeft(profile)

  return (
    <GuidedFlowShell
      step={3}
      eyebrow="Payment review"
      title="You're almost in"
      description="We're reviewing your payment screenshot now. This usually takes less than 12h."
      onBack={() => navigate('/payment', { replace: true })}
    >
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[20px]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="mt-5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Payment received</h2>
          <p className="mt-2 text-sm text-white/68">We are reviewing your screenshot and will confirm the payment as quickly as possible.</p>
        </div>
      </section>

      <section className="rounded-3xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/8 p-5 backdrop-blur-[20px]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[#c084fc]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">You can start using Premium now</p>
            <p className="mt-1 text-sm text-white/70">Your premium trial is already active while review finishes in the background.</p>
            {hoursLeft > 0 ? (
              <p className="mt-3 inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/78">
                About {hoursLeft}h of Premium trial remaining
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => navigate('/dashboard', { replace: true, state: { fromOnboarding: true } })}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
        >
          Go to dashboard
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => navigate('/payment', { replace: true })}
          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
        >
          Back
        </button>
      </div>
    </GuidedFlowShell>
  )
}

export default PaymentPending
