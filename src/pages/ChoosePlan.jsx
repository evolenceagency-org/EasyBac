import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const freeFeatures = ['Basic tracking', 'Limited sessions', 'Pomodoro timer']
const premiumFeatures = [
  'Unlimited sessions',
  'AI insights',
  'Advanced analytics',
  'Subject tracking',
  'Priority support'
]

const ChoosePlan = () => {
  const { startFreeTrial, initialized, loading } = useAuth()
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState('')
  const [actionError, setActionError] = useState('')

  const canStartTrial = initialized && !loading

  const handleFreeTrial = async () => {
    setActionError('')
    if (!canStartTrial) return
    try {
      setLoadingPlan('free')
      await startFreeTrial()
      navigate('/dashboard', { replace: true })
    } catch {
      setActionError('Unable to start trial. Please try again.')
    } finally {
      setLoadingPlan('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="relative px-4 pb-14 pt-8 md:px-12 md:pb-16 md:pt-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.16),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.14),transparent_32%)]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mx-auto mt-14 flex w-full max-w-4xl flex-col gap-4 md:mt-20 md:gap-6"
        >
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:p-7">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Choose your plan to continue
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Select the plan that fits your Bac journey. You must choose one to proceed.
            </p>
            <span className="mt-5 block h-[2px] w-40 bg-gradient-to-r from-purple-500 to-blue-500" />
          </div>

          <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:p-6"
            >
              <p className="text-xs uppercase tracking-wide text-white/60">Start Free Trial</p>
              <p className="mt-2 text-3xl font-bold">3 Days Trial</p>
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
                onClick={handleFreeTrial}
                disabled={loadingPlan === 'free' || !canStartTrial}
                className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingPlan === 'free'
                  ? 'Starting...'
                  : !canStartTrial
                    ? 'Setting up...'
                    : 'Start Free Trial'}
              </button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="relative rounded-2xl border border-purple-500/40 bg-gradient-to-br from-purple-600/20 to-blue-600/20 p-5 shadow-[0_0_40px_rgba(139,92,246,0.25)] backdrop-blur-xl md:p-6"
            >
              <div className="absolute right-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-purple-300/25 bg-purple-500/20 px-3 py-1 text-xs text-purple-100">
                  Recommended
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

              <button
                type="button"
                onClick={() => navigate('/payment')}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(139,92,246,0.45)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_35px_rgba(139,92,246,0.6)]"
              >
                Start with Premium
              </button>
            </motion.div>
          </div>

          {actionError && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {actionError}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default ChoosePlan
