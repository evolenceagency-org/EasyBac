import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureValidRoute, hasSelectedPlan, isEmailVerified } from '../utils/authFlow.js'
import { isPersonalized } from '../utils/personalization.js'

const freeFeatures = ['Study dashboard', 'Task tracking', 'Exam practice']
const proFeatures = ['Unlimited sessions', 'AI insights', 'Advanced analytics', 'Priority features']

const ChoosePlan = () => {
  const { user, profile, initialized, loading, profileLoading, selectPlan } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState('')
  const [actionError, setActionError] = useState('')

  const canSelectPlan = initialized && !loading && !profileLoading && Boolean(user)

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

    if (hasSelectedPlan(profile)) {
      const safeRoute = ensureValidRoute({ user, profile, currentPath: '/choose-plan' })
      if (safeRoute && safeRoute !== '/choose-plan') {
        navigate(safeRoute, { replace: true })
      }
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const handleSelectPlan = async (nextPlan) => {
    setActionError('')
    if (!canSelectPlan) {
      setActionError('Please log in first.')
      return
    }

    try {
      setLoadingPlan(nextPlan)
      await selectPlan(nextPlan)
      navigate('/dashboard', { replace: true })
    } catch {
      setActionError('Unable to save your plan right now. Please try again.')
    } finally {
      setLoadingPlan('')
    }
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
          <button
            type="button"
            onClick={() => navigate('/personalization', { replace: true })}
            className="inline-flex w-fit items-center gap-2 text-[13px] text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl md:p-7">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Choose your plan to continue
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Pick the experience you want to start with. Once you choose, we&apos;ll finish onboarding and take you into the dashboard.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl md:p-6"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">Free</p>
              <p className="mt-2 text-3xl font-bold">Start Free</p>
              <p className="mt-1 text-sm text-white/65">A lighter starting point with the core study workflow.</p>
              <ul className="mt-5 space-y-3">
                {freeFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/75">
                    <CheckCircle2 className="h-4 w-4 text-white/60" />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSelectPlan('trial')}
                disabled={loadingPlan === 'trial' || !canSelectPlan}
                className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === 'trial'
                  ? 'Starting...'
                  : !canSelectPlan
                    ? 'Setting up...'
                    : 'Choose Free'}
              </button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="rounded-2xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/10 p-5 shadow-[0_0_28px_rgba(139,92,246,0.18)] backdrop-blur-xl md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-wide text-white/70">Pro</p>
                <span className="rounded-full border border-[#c084fc]/30 bg-[#8b5cf6]/15 px-3 py-1 text-[11px] text-[#eadcff]">
                  Recommended
                </span>
              </div>
              <p className="mt-2 text-3xl font-bold">Start Pro</p>
              <p className="mt-1 text-sm text-white/70">Save Pro as your preferred plan and continue setup without leaving onboarding.</p>

              <ul className="mt-5 space-y-3">
                {proFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-white/85">
                    <CheckCircle2 className="h-4 w-4 text-[#d8b4fe]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSelectPlan('premium')}
                disabled={loadingPlan === 'premium' || !canSelectPlan}
                className="mt-6 w-full rounded-xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.32)] transition-all duration-300 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === 'premium'
                  ? 'Starting...'
                  : !canSelectPlan
                    ? 'Setting up...'
                    : 'Choose Pro'}
              </button>
            </motion.div>
          </div>

          {actionError ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {actionError}
            </div>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}

export default ChoosePlan
