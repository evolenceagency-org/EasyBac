import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Copy,
  Landmark,
  MessageCircleMore,
  ShieldCheck
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GuidedFlowShell from '../components/flow/GuidedFlowShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { paymentPhone, paymentText, rib, whatsappLink } from '../config/paymentConfig.js'
import { getAuthenticatedHomeRoute, hasSelectedPlan, isEmailVerified } from '../utils/authFlow.js'
import { isPersonalized } from '../utils/personalization.js'
import { hasPremiumAccess, isPremiumTrialActive } from '../utils/subscription.js'

const paymentSteps = [
  'Copy the RIB and complete the bank transfer.',
  'Take a screenshot of the transfer confirmation.',
  'Send that screenshot so we can verify the payment quickly.'
]

const Payment = () => {
  const navigate = useNavigate()
  const {
    user,
    profile,
    initialized,
    loading,
    profileLoading,
    startPremiumTrialCheckout
  } = useAuth()
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionError, setActionError] = useState('')

  const normalizedPhone = paymentPhone.replace(/[^\d]/g, '')
  const contactHref = useMemo(() => {
    if (whatsappLink) return whatsappLink
    if (!normalizedPhone) return ''

    const message =
      paymentText ||
      'Hello, I completed the bank transfer and I am sending my payment screenshot for verification.'

    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`
  }, [normalizedPhone])

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
      return
    }

    if (isPremiumTrialActive(profile) || profile?.plan === 'premium_trial') {
      navigate('/payment-pending', { replace: true })
      return
    }

    if (hasSelectedPlan(profile) && profile?.plan !== 'premium') {
      navigate('/dashboard', { replace: true })
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const handleCopyRib = async () => {
    if (!rib) return

    try {
      await navigator.clipboard.writeText(rib)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch (error) {
      console.error('Failed to copy RIB:', error)
    }
  }

  const handleConfirmProofSent = async () => {
    setActionError('')

    try {
      setSending(true)
      const nextProfile = await startPremiumTrialCheckout()
      const nextRoute =
        isPremiumTrialActive(nextProfile) || nextProfile?.plan === 'premium_trial'
          ? '/payment-pending'
          : getAuthenticatedHomeRoute({ user, profile: nextProfile }) || '/dashboard'

      navigate(nextRoute, { replace: true })
    } catch (error) {
      setActionError(
        error?.message ||
          'We could not open Premium right now. Please try again once your screenshot is sent.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <GuidedFlowShell
      step={3}
      eyebrow="Payment instructions"
      title="Send your payment screenshot"
      description="Use the RIB below for the transfer, then send the screenshot so we can verify your payment. As soon as you confirm that step here, Premium trial opens right away."
      onBack={() => navigate('/checkout', { replace: true })}
    >
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">Bank transfer</p>
            <h2 className="mt-2 text-2xl font-semibold">Copy the RIB</h2>
            <p className="mt-2 text-sm text-white/65">
              This is the account to pay into before you send your screenshot for review.
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/12 text-[#d8b4fe]">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0b0b0f] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">RIB</p>
          <p className="mt-3 break-all text-sm font-medium leading-6 text-white">
            {rib || 'RIB is not configured yet. Please add VITE_RIB in the environment before using this flow.'}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleCopyRib}
            disabled={!rib}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/[0.14] hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'RIB copied' : 'Copy RIB'}
          </button>

          <a
            href={contactHref || undefined}
            target={contactHref ? '_blank' : undefined}
            rel={contactHref ? 'noreferrer' : undefined}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
              contactHref
                ? 'bg-[#8b5cf6] text-white hover:bg-[#7c3aed]'
                : 'pointer-events-none border border-white/[0.08] bg-white/[0.04] text-white/40'
            }`}
          >
            <MessageCircleMore className="h-4 w-4" />
            Send screenshot
          </a>
        </div>

        {!contactHref ? (
          <p className="mt-3 text-sm text-amber-200/85">
            Add `VITE_PAYMENT_PHONE` or `VITE_WHATSAPP_LINK` in your environment so users know exactly where to send the screenshot.
          </p>
        ) : null}
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.05, ease: 'easeOut' }}
        className="rounded-3xl border border-white/[0.08] bg-[#0b0b0f] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[#d8b4fe]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-semibold text-white">Make the handoff once</p>
            <p className="mt-1 text-sm text-white/65">
              The flow is simple: transfer, screenshot, send. Then we move you into Premium review while keeping access open.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {paymentSteps.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: 0.08 + index * 0.05, ease: 'easeOut' }}
              className="flex items-start gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3 text-sm text-white/78"
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-white/70">
                {index + 1}
              </span>
              <span>{step}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/8 px-4 py-3 text-sm text-white/74">
          Once you send the screenshot, tap the confirmation button below. We'll move you to payment review and unlock Premium trial immediately.
        </div>

        {actionError ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {actionError}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleConfirmProofSent}
            disabled={sending || !rib || !contactHref}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? 'Opening Premium...' : "I've sent the screenshot"}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/checkout', { replace: true })}
            disabled={sending}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white/82 transition hover:border-white/[0.14] hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        </div>
      </motion.section>
    </GuidedFlowShell>
  )
}

export default Payment
