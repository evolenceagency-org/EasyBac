import { useEffect, useMemo } from 'react'
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GuidedFlowShell from '../components/flow/GuidedFlowShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isEmailVerified } from '../utils/authFlow.js'
import { getPremiumTrialHoursLeft, hasPremiumAccess, isPremiumTrialActive } from '../utils/subscription.js'
import { isPersonalized } from '../utils/personalization.js'

const premiumDetails = [
  'Premium trial opens right after your screenshot handoff',
  'Priority AI suggestions',
  'Advanced study controls',
  'A clean review flow with no blocked waiting state'
]

const Checkout = () => {
  const navigate = useNavigate()
  const { user, profile, initialized, loading, profileLoading } = useAuth()

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
      navigate('/onboarding', { replace: true })
      return
    }

    if (hasPremiumAccess(profile) && !isPremiumTrialActive(profile)) {
      navigate('/dashboard', { replace: true })
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  return (
    <GuidedFlowShell
      step={3}
      eyebrow="Checkout"
      title="Confirm Premium"
      description="Review the plan, then continue to a simple payment handoff with the RIB and screenshot instructions."
      onBack={() => navigate('/choose-plan', { replace: true })}
    >
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Plan summary</p>
            <h2 className="mt-2 text-2xl font-semibold">EasyBac Premium</h2>
            <p className="mt-2 text-sm text-white/65">We'll guide the user through the bank transfer details first, then open Premium trial right after they confirm the screenshot handoff.</p>
          </div>
          <div className="text-right">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
              <CreditCard className="h-5 w-5" />
            </div>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">Price</p>
            <p className="mt-1 text-lg font-semibold text-white">299 MAD</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {premiumDetails.map((detail) => (
            <div key={detail} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm text-white/78">
              <CheckCircle2 className="h-4 w-4 text-[#c084fc]" />
              {detail}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/8 px-4 py-3 text-sm text-white/74">
          Continue to payment to copy the RIB, send the proof screenshot, and then move into review with Premium trial already unlocked.
        </div>

        {premiumTrialHours > 0 ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-white/75">
            <ShieldCheck className="h-3.5 w-3.5 text-[#c084fc]" />
            You already have about {premiumTrialHours}h of premium trial remaining.
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/payment', { replace: true })}
            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
          >
            Continue to payment
          </button>
          <button
            type="button"
            onClick={() => navigate('/choose-plan', { replace: true })}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
          >
            Back
          </button>
        </div>
      </section>
    </GuidedFlowShell>
  )
}

export default Checkout
