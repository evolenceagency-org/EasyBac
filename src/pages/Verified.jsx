import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { EMAIL_OTP_LENGTH, ensureValidRoute } from '../utils/authFlow.js'

const Verified = () => {
  const navigate = useNavigate()
  const { user, profile, initialized } = useAuth()

  useEffect(() => {
    if (!initialized || !user) return
    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/verified' })
    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [initialized, navigate, profile, user])

  const helperText = useMemo(() => {
    if (!initialized) return 'Verifying your session...'
    if (!user) {
      return `Verification now uses an ${EMAIL_OTP_LENGTH}-digit email code. Continue to the code screen to finish setup.`
    }
    return 'Your email has been successfully verified. Continue to finish setup.'
  }, [initialized, user])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#0a0d1a] to-[#1b0d2a] px-4 py-10 text-white md:px-6 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-2xl backdrop-blur-xl md:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/40 to-blue-500/40 shadow-[0_0_25px_rgba(139,92,246,0.35)]">
          <MailCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="mt-6 text-xl font-semibold md:text-2xl">Email verified</h1>
        <p className="mt-2 text-sm text-white/70">{helperText}</p>

        <button
          type="button"
          onClick={() => navigate(user ? '/onboarding' : '/verify', { replace: true })}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]"
        >
          {user ? 'Continue' : 'Enter verification code'}
        </button>
      </motion.div>
    </div>
  )
}

export default Verified

