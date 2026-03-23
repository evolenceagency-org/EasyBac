import { useState } from 'react'
import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { normalizeSubscriptionStatus } from '../utils/subscription.js'
import { paymentPhone, rib } from '../config/paymentConfig.js'

const Payment = () => {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const status = normalizeSubscriptionStatus(profile?.subscription_status)

  const normalizedPhone = paymentPhone.replace(/[^\d]/g, '')
  const whatsappMessage = encodeURIComponent(
    'Hello, I have completed the payment. Here is my receipt.'
  )
  const whatsappUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${whatsappMessage}`
    : '#'

  if (profile && (profile.payment_verified || status === 'premium')) {
    return <Navigate to="/dashboard" replace />
  }

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

  const steps = [
    'Copy the RIB',
    'Send payment via bank transfer',
    'Take a screenshot of the payment',
    'Send the screenshot via WhatsApp',
    'Wait for account activation'
  ]

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#090913] to-[#05050a] px-4 py-8 md:px-6 md:py-10">
      <div className="pointer-events-none absolute -left-20 top-0 hidden h-72 w-72 rounded-full bg-purple-500/20 blur-3xl md:block" />
      <div className="pointer-events-none absolute -right-20 bottom-0 hidden h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl md:block" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-[440px] rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-7"
      >
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" />
        <div className="pointer-events-none absolute -inset-8 -z-10 hidden rounded-[40px] bg-gradient-to-tr from-purple-500/25 via-blue-400/10 to-cyan-400/15 blur-3xl md:block" />

        <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">Unlock Premium Access</h1>
        <p className="mt-2 text-sm text-white/70">
          Complete your payment to activate your account.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">RIB</p>
              <p className="mt-1 break-all text-sm font-medium text-white">{rib || 'RIB not configured'}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyRib}
              disabled={!rib}
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-all duration-300 hover:border-white/25 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? 'Copied!' : 'Copy RIB'}
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Payment Steps</p>
          <ol className="mt-3 space-y-2 text-sm text-white/75">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[11px] text-white/80">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 ${
            normalizedPhone
              ? 'bg-emerald-500 text-zinc-900 hover:scale-[1.02] hover:bg-emerald-400 hover:shadow-[0_0_28px_rgba(16,185,129,0.45)]'
              : 'cursor-not-allowed bg-white/10 text-white/40'
          }`}
        >
          Send Receipt via WhatsApp
        </a>
        {!normalizedPhone && (
          <p className="mt-3 text-center text-xs text-white/50">
            WhatsApp contact is not configured yet.
          </p>
        )}

        <p className="mt-4 text-center text-xs text-white/50">
          Access is activated manually within a few hours.
        </p>
      </motion.div>
    </div>
  )
}

export default Payment
