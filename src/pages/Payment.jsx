import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { checkSubscription } from '../utils/subscription.js'

const WHATSAPP_NUMBER = '212600000000'

const Payment = () => {
  const { user, profile, loading } = useAuth()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('payment_submitted')
    setSubmitted(stored === 'true')
  }, [])

  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }

  if (profile) {
    const subscription = checkSubscription(profile)
    if (subscription.allowed) {
      return <Navigate to="/dashboard" replace />
    }
  }

  const handleWhatsApp = () => {
    localStorage.setItem('payment_submitted', 'true')
    setSubmitted(true)
  }

  const message = encodeURIComponent(
    'Hello, I have completed payment for EasyBac. Please verify my subscription.'
  )
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-800 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="text-2xl font-semibold">Unlock Full Access</h1>
        {submitted ? (
          <p className="mt-3 text-sm text-zinc-300">
            Payment received. Waiting for confirmation.
          </p>
        ) : (
          <>
            <p className="mt-3 text-sm text-zinc-300">
              Your trial has ended. To regain access, please complete the payment
              and send the receipt.
            </p>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
              <p className="font-semibold text-white">Payment Phone Number</p>
              <p className="mt-1">+212 6 00 00 00 00</p>
              <p className="mt-3 text-xs text-zinc-400">
                Send the receipt via WhatsApp for verification.
              </p>
            </div>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              onClick={handleWhatsApp}
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-900"
            >
              Send Payment Receipt via WhatsApp
            </a>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default Payment
