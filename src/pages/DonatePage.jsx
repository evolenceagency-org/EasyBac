import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, HeartHandshake, Zap } from 'lucide-react'
import AmountSelector from '../components/AmountSelector.jsx'

const getTierConfig = (amount) => {
  if (amount >= 200) {
    return {
      message: 'You are a legend. Thank you 👑',
      border: 'border-amber-400/50',
      glow: 'shadow-[0_0_45px_rgba(234,179,8,0.35)]',
      accent: 'text-amber-300'
    }
  }
  if (amount >= 100) {
    return {
      message: 'You are among top supporters 🔥',
      border: 'border-purple-400/50',
      glow: 'shadow-[0_0_40px_rgba(139,92,246,0.35)]',
      accent: 'text-purple-300'
    }
  }
  if (amount >= 50) {
    return {
      message: 'You are making a real impact 🚀',
      border: 'border-blue-400/40',
      glow: 'shadow-[0_0_35px_rgba(59,130,246,0.3)]',
      accent: 'text-blue-300'
    }
  }
  if (amount >= 20) {
    return {
      message: 'You are supporting the project 💜',
      border: 'border-purple-300/30',
      glow: 'shadow-[0_0_25px_rgba(139,92,246,0.2)]',
      accent: 'text-purple-200'
    }
  }
  return {
    message: 'Every bit helps 🙏',
    border: 'border-white/15',
    glow: 'shadow-[0_0_18px_rgba(255,255,255,0.08)]',
    accent: 'text-white/70'
  }
}

const DonatePage = () => {
  const [amount, setAmount] = useState(20)
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [openingWhatsapp, setOpeningWhatsapp] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const whatsappTimerRef = useRef(null)
  const awaitingTimerRef = useRef(null)
  const lastAmountRef = useRef(amount)

  const rib = useMemo(() => (import.meta.env.VITE_RIB || '').trim(), [])
  const phone = useMemo(() => {
    const raw = import.meta.env.VITE_PAYMENT_PHONE || ''
    return raw.replace(/[^\d]/g, '')
  }, [])

  useEffect(() => {
    if (amount > lastAmountRef.current) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 260)
      return () => clearTimeout(timer)
    }
    lastAmountRef.current = amount
    return undefined
  }, [amount])

  useEffect(() => {
    lastAmountRef.current = amount
  }, [amount])

  useEffect(() => {
    return () => {
      if (whatsappTimerRef.current) clearTimeout(whatsappTimerRef.current)
      if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current)
    }
  }, [])

  const tier = getTierConfig(amount)
  const progress = Math.min(amount, 300) / 300

  const handleCopy = async () => {
    if (!rib) return
    try {
      await navigator.clipboard.writeText(rib)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error('Failed to copy RIB', error)
    }
  }

  const whatsappLink = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(
        `I want to support BacTracker with ${amount} MAD.`
      )}`
    : ''

  const handleWhatsappClick = (event) => {
    if (!whatsappLink) {
      event.preventDefault()
      return
    }
    setOpeningWhatsapp(true)
    setAwaitingConfirmation(false)
    if (whatsappTimerRef.current) clearTimeout(whatsappTimerRef.current)
    whatsappTimerRef.current = setTimeout(() => setOpeningWhatsapp(false), 1500)
    if (awaitingTimerRef.current) clearTimeout(awaitingTimerRef.current)
    awaitingTimerRef.current = setTimeout(() => setAwaitingConfirmation(true), 4000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="relative px-4 pb-16 pt-10 md:px-12 md:pb-20 md:pt-16">
        <div className="pointer-events-none absolute -left-20 top-0 hidden h-72 w-72 rounded-full bg-purple-500/20 blur-3xl md:block" />
        <div className="pointer-events-none absolute -right-10 bottom-10 hidden h-72 w-72 rounded-full bg-blue-500/20 blur-3xl md:block" />

        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight md:text-4xl">
              Support the project. Build your success.
            </h1>
            <p className="mt-3 text-sm text-white/70 md:text-base">
              Your contribution helps improve the platform and support your Bac journey.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mt-8 flex justify-center md:mt-10"
          >
            <motion.div
              whileHover={{ scale: 1.01 }}
              animate={pulse ? { scale: [1, 1.02, 1] } : { scale: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={`relative w-full max-w-3xl rounded-2xl border bg-[rgba(20,20,30,0.6)] p-5 backdrop-blur-xl md:p-8 ${tier.border} ${tier.glow}`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
                Donate
              </div>

              <div className="grid gap-5 md:gap-8 lg:grid-cols-[1.2fr_1fr]">
                <div className="space-y-5 md:space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/30 to-blue-500/30">
                      <HeartHandshake className="h-5 w-5 text-purple-200" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                        Contribution amount
                      </p>
                      <motion.div
                        key={amount}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="text-xl font-semibold text-white md:text-2xl"
                      >
                        {amount} MAD
                      </motion.div>
                    </div>
                  </div>

                  <AmountSelector amount={amount} onChange={setAmount} />

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-3">
                      <Zap className={`mt-0.5 h-4 w-4 ${tier.accent}`} />
                      <div>
                        <p className="text-sm text-white/80">{tier.message}</p>
                        <p className="mt-1 text-xs text-white/50">
                          Your support keeps BacTracker improving every week.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 md:space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      Community support progress
                    </p>
                    <div className="mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-purple-400 to-blue-500"
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                      {Math.round(progress * 100)}% toward a 300 MAD milestone
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      Bank transfer
                    </p>
                    <p className="mt-2 text-sm text-white/80">Account name: BacTracker Support</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                      <span className="text-sm font-medium text-white">{rib || 'RIB not configured yet.'}</span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!rib}
                        className="ml-auto inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white transition-all duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy RIB
                      </button>
                    </div>
                    <AnimatePresence>
                      {copied && (
                        <motion.p
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="mt-2 text-xs text-emerald-300"
                        >
                          RIB copied
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                      WhatsApp fallback
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      Pay via WhatsApp if bank transfer is not possible right now.
                    </p>
                    <a
                      href={whatsappLink || '#'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleWhatsappClick}
                      className={`mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                        whatsappLink
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] hover:scale-[1.02]'
                          : 'cursor-not-allowed bg-white/10 text-white/40'
                      }`}
                    >
                      Pay via WhatsApp
                    </a>
                    <AnimatePresence>
                      {openingWhatsapp && (
                        <motion.p
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="mt-3 text-xs text-white/60"
                        >
                          Opening WhatsApp...
                        </motion.p>
                      )}
                    </AnimatePresence>
                    {awaitingConfirmation && (
                      <div className="mt-3 inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-1 text-xs text-yellow-400">
                        Awaiting confirmation...
                      </div>
                    )}
                    <p className="mt-3 text-xs text-white/50">
                      After sending your payment, contact us on WhatsApp for activation.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default DonatePage

