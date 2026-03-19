import { motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive } from '../utils/subscription.js'
import { paymentPhone, paymentText, whatsappLink } from '../config/paymentConfig.js'

const Payment = () => {
  const { user, profile, loading } = useAuth()

  if (!user && !loading) {
    return <Navigate to="/login" replace />
  }

  if (profile && isSubscriptionActive(profile)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-800 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h1 className="text-2xl font-semibold">Unlock Premium Access</h1>
        <p className="mt-3 text-sm text-zinc-300">
          Your free trial is over. Please complete payment to continue.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
          <p className="font-semibold text-white">Payment Phone Number</p>
          <p className="mt-1">{paymentPhone}</p>
          <p className="mt-3 text-xs text-zinc-400">{paymentText}</p>
        </div>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-900"
        >
          Send Receipt via WhatsApp
        </a>
      </motion.div>
    </div>
  )
}

export default Payment
