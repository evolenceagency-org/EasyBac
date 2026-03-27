import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { isPersonalized } from '../utils/personalization.js'
import { normalizeSubscriptionStatus } from '../utils/subscription.js'
import { hasCompletedOnboarding } from '../utils/authFlow.js'

const steps = [
  { id: 'personalization', label: 'Personalization' },
  { id: 'plan', label: 'Choose Plan' }
]

const Onboarding = () => {
  const navigate = useNavigate()
  const { initialized, loading, user, profile, profileLoading } = useAuth()

  const nextRoute = useMemo(() => {
    if (!profile) return null
    if (!isPersonalized(profile)) return '/personalization'

    const currentPlan = String(profile.plan || '').toLowerCase()
    const currentStatus = normalizeSubscriptionStatus(profile.subscription_status)
    if (!currentPlan && currentStatus === 'free') return '/choose-plan'

    return hasCompletedOnboarding(profile) ? '/dashboard' : '/choose-plan'
  }, [profile])

  useEffect(() => {
    if (!initialized || loading || profileLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    if (!nextRoute) return
    const timer = window.setTimeout(() => navigate(nextRoute, { replace: true }), 240)
    return () => window.clearTimeout(timer)
  }, [initialized, loading, navigate, nextRoute, profileLoading, user])

  const completedPersonalization = isPersonalized(profile)
  const completedPlan = Boolean(
    profile?.plan || normalizeSubscriptionStatus(profile?.subscription_status) !== 'free'
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050507] px-4 text-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-xl rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">Onboarding</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Let&apos;s finish your setup</h1>
        <p className="mt-2 text-sm leading-6 text-white/65">
          We are taking you to the next required step so your account is fully ready before you land in the dashboard.
        </p>

        <div className="mt-6 space-y-3">
          {steps.map((step) => {
            const completed =
              step.id === 'personalization' ? completedPersonalization : completedPlan
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3"
              >
                {completed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                ) : (
                  <Circle className="h-4 w-4 text-white/35" />
                )}
            <span className="text-sm text-white/82">{step.label}</span>
          </div>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 px-4 py-3 text-sm text-[#e9ddff]">
          {profileLoading || !nextRoute
            ? 'Preparing your onboarding flow...'
            : `Redirecting to ${
                nextRoute === '/personalization'
                  ? 'Personalization'
                  : nextRoute === '/choose-plan'
                    ? 'Choose Plan'
                    : 'Dashboard'
              }...`}
        </div>
      </motion.div>
    </div>
  )
}

export default Onboarding
