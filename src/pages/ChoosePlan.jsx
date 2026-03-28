import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GuidedFlowShell from '../components/flow/GuidedFlowShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthenticatedHomeRoute, hasSelectedPlan, isEmailVerified } from '../utils/authFlow.js'
import { isPersonalized } from '../utils/personalization.js'

const freeFeatures = ['Core study dashboard', 'Task planning', 'Exam practice']
const premiumFeatures = ['Premium trial instantly', 'AI guidance', 'Advanced focus tools']

const ChoosePlan = () => {
  const { user, profile, initialized, loading, profileLoading, selectPlan } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState('')
  const [actionError, setActionError] = useState('')

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

    if (hasSelectedPlan(profile)) {
      const safeRoute = getAuthenticatedHomeRoute({ user, profile })
      if (safeRoute && safeRoute !== '/choose-plan') {
        navigate(safeRoute, { replace: true })
      }
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const handleSelectPlan = async (nextPlan) => {
    setActionError('')

    try {
      setLoadingPlan(nextPlan)
      if (nextPlan === 'premium') {
        navigate('/checkout', { replace: true })
        return
      }

      await selectPlan('trial')
      navigate('/dashboard', { replace: true, state: { fromOnboarding: true } })
    } catch {
      setActionError('We could not save that choice right now. Please try once more.')
    } finally {
      setLoadingPlan('')
    }
  }

  return (
    <GuidedFlowShell
      step={2}
      eyebrow="Choose plan"
      title="Pick the path you want to start with"
      description="One clear choice now, and we’ll take care of the rest."
      onBack={() => navigate('/onboarding', { replace: true })}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <motion.section
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Free</p>
          <h2 className="mt-3 text-2xl font-semibold">Start free</h2>
          <p className="mt-2 text-sm text-white/65">A clean starting point for planning, studying, and getting into rhythm.</p>
          <div className="mt-5 space-y-3">
            {freeFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-white/78">
                <CheckCircle2 className="h-4 w-4 text-white/55" />
                {feature}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleSelectPlan('trial')}
            disabled={loadingPlan === 'trial'}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/[0.16] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPlan === 'trial' ? 'Starting...' : 'Start free'}
          </button>
        </motion.section>

        <motion.section
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="rounded-3xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-5 shadow-[0_0_24px_rgba(139,92,246,0.16)] backdrop-blur-[20px]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Premium</p>
            <span className="rounded-full border border-[#c084fc]/25 bg-[#8b5cf6]/12 px-3 py-1 text-[11px] text-[#eadcff]">
              Recommended
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold">Start Premium</h2>
          <p className="mt-2 text-sm text-white/68">Go to checkout, get immediate premium trial access, and keep moving while payment review happens.</p>
          <div className="mt-5 space-y-3">
            {premiumFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-white/82">
                <CheckCircle2 className="h-4 w-4 text-[#d8b4fe]" />
                {feature}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleSelectPlan('premium')}
            disabled={loadingPlan === 'premium'}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingPlan === 'premium' ? 'Opening checkout...' : 'Start Premium'}
          </button>
        </motion.section>
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </div>
      ) : null}
    </GuidedFlowShell>
  )
}

export default ChoosePlan

