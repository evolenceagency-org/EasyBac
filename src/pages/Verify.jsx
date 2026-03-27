import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  EMAIL_OTP_LENGTH,
  OTP_ATTEMPT_WINDOW_MS,
  OTP_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
  clearPendingVerificationEmail,
  ensureValidRoute,
  getPendingVerificationEmail,
  isEmailVerified,
  persistPendingVerificationEmail
} from '../utils/authFlow.js'
import { getAuthErrorMessage, validateEmail } from '../utils/authValidation.js'

const ATTEMPT_STORAGE_PREFIX = 'auth:otp-attempts:'

const readAttemptState = (email) => {
  if (typeof window === 'undefined' || !email) return { attempts: 0, blockedUntil: 0 }
  try {
    const raw = window.localStorage.getItem(`${ATTEMPT_STORAGE_PREFIX}${email}`)
    if (!raw) return { attempts: 0, blockedUntil: 0 }
    const parsed = JSON.parse(raw)
    const updatedAt = Number(parsed?.updatedAt) || 0
    if (updatedAt && Date.now() - updatedAt > OTP_ATTEMPT_WINDOW_MS) {
      return { attempts: 0, blockedUntil: 0 }
    }
    if ((parsed?.blockedUntil || 0) < Date.now()) {
      return { attempts: 0, blockedUntil: 0 }
    }
    return {
      attempts: Number(parsed?.attempts) || 0,
      blockedUntil: Number(parsed?.blockedUntil) || 0
    }
  } catch {
    return { attempts: 0, blockedUntil: 0 }
  }
}

const saveAttemptState = (email, state) => {
  if (typeof window === 'undefined' || !email) return
  window.localStorage.setItem(`${ATTEMPT_STORAGE_PREFIX}${email}`, JSON.stringify(state))
}

const Verify = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, initialized, sendVerificationCode, verifyCode, refreshAuthState } = useAuth()
  const [pendingEmail, setPendingEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [attemptState, setAttemptState] = useState({ attempts: 0, blockedUntil: 0 })
  const [attemptTick, setAttemptTick] = useState(Date.now())

  useEffect(() => {
    const emailFromState = location.state?.email || ''
    const emailFromSession = getPendingVerificationEmail()
    const nextEmail = (emailFromState || emailFromSession || user?.email || '').trim().toLowerCase()
    setPendingEmail(nextEmail)
    if (nextEmail) {
      persistPendingVerificationEmail(nextEmail)
      setAttemptState(readAttemptState(nextEmail))
    }
  }, [location.state?.email, user?.email])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    if (!attemptState.blockedUntil || attemptState.blockedUntil <= Date.now()) return undefined
    const timer = window.setInterval(() => setAttemptTick(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [attemptState.blockedUntil])

  useEffect(() => {
    if (!pendingEmail || !attemptState.blockedUntil) return
    if (attemptState.blockedUntil > Date.now()) return
    const resetState = { attempts: 0, blockedUntil: 0, updatedAt: Date.now() }
    saveAttemptState(pendingEmail, resetState)
    setAttemptState(resetState)
  }, [attemptState.blockedUntil, pendingEmail, attemptTick])

  useEffect(() => {
    if (!initialized || !user || !isEmailVerified(user)) return
    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/verify-code' })
    navigate(safeRoute || '/choose-plan', { replace: true })
  }, [initialized, navigate, profile, user])

  const blockedForSeconds = useMemo(() => {
    if (!attemptState.blockedUntil) return 0
    return Math.max(0, Math.ceil((attemptState.blockedUntil - Date.now()) / 1000))
  }, [attemptState.blockedUntil, attemptTick])

  const canVerify = Boolean(
    code.trim().length === EMAIL_OTP_LENGTH &&
      pendingEmail &&
      !loading &&
      blockedForSeconds === 0
  )

  const handleResend = async () => {
    if (!pendingEmail || cooldown > 0 || resending) return
    setError('')
    setSuccess('')
    setResending(true)
    try {
      await sendVerificationCode(pendingEmail)
      setSuccess(`A new code was sent to ${pendingEmail}.`)
      setCooldown(OTP_COOLDOWN_SECONDS)
    } catch (resendError) {
      setError(getAuthErrorMessage(resendError))
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const emailError = validateEmail(pendingEmail)
    if (emailError) {
      setError(emailError)
      return
    }

    if (code.trim().length !== EMAIL_OTP_LENGTH) {
      setError(`Enter the ${EMAIL_OTP_LENGTH}-digit verification code.`)
      return
    }

    if (blockedForSeconds > 0) {
      setError(`Too many attempts. Try again in ${blockedForSeconds}s.`)
      return
    }

    try {
      setLoading(true)
      const nextAttempts = attemptState.attempts + 1
      const blockedUntil =
        nextAttempts >= OTP_MAX_ATTEMPTS ? Date.now() + OTP_ATTEMPT_WINDOW_MS : 0
      const snapshot = { attempts: nextAttempts, blockedUntil, updatedAt: Date.now() }
      saveAttemptState(pendingEmail, snapshot)
      setAttemptState(snapshot)

      await verifyCode(pendingEmail, code)
      saveAttemptState(pendingEmail, { attempts: 0, blockedUntil: 0, updatedAt: Date.now() })
      clearPendingVerificationEmail()
      const refreshed = await refreshAuthState()
      setSuccess('Verification successful.')
      const safeRoute = ensureValidRoute({
        user: refreshed?.user || user,
        profile,
        currentPath: '/verify-code'
      })
      navigate(safeRoute || '/choose-plan', { replace: true })
    } catch (verifyError) {
      setError(getAuthErrorMessage(verifyError))
    } finally {
      setLoading(false)
    }
  }

  const handleUseAnotherEmail = () => {
    clearPendingVerificationEmail()
    navigate('/register', { replace: true })
  }

  if (!pendingEmail && !user?.email) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#0a0d1a] to-[#1b0d2a] px-4 py-10 text-white md:px-6 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/40 to-blue-500/40 shadow-[0_0_25px_rgba(139,92,246,0.35)]">
            <MailCheck className="h-6 w-6 text-white" />
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-xl font-semibold md:text-2xl">We need your email first</h1>
            <p className="mt-2 text-sm text-white/70">
              Start from register or login so we know which account to verify.
            </p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 transition-all duration-300 hover:bg-white/10"
            >
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

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
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl md:p-8"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/40 to-blue-500/40 shadow-[0_0_25px_rgba(139,92,246,0.35)]">
          <MailCheck className="h-6 w-6 text-white" />
        </div>

        <div className="mt-6 text-center">
          <h1 className="text-xl font-semibold md:text-2xl">Enter your verification code</h1>
          <p className="mt-2 text-sm text-white/70">
            We sent an {EMAIL_OTP_LENGTH}-digit code{pendingEmail ? ` to ${pendingEmail}` : ''}. Enter it below to continue.
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="verification-email" className="text-xs font-medium text-white/70">
              Email
            </label>
            <input
              id="verification-email"
              type="email"
              value={pendingEmail}
              onChange={(event) => {
                const nextEmail = event.target.value.trim().toLowerCase()
                setPendingEmail(nextEmail)
                setError('')
                setSuccess('')
                persistPendingVerificationEmail(nextEmail)
                setAttemptState(readAttemptState(nextEmail))
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition-all duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="verification-code" className="text-xs font-medium text-white/70">
              {EMAIL_OTP_LENGTH}-digit code
            </label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={EMAIL_OTP_LENGTH}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, EMAIL_OTP_LENGTH))
                setError('')
                setSuccess('')
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white outline-none transition-all duration-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/40"
              placeholder={'0'.repeat(EMAIL_OTP_LENGTH)}
            />
            <div className="flex items-center justify-between text-xs text-white/55">
              <span>Code expires in 5-10 minutes.</span>
              {blockedForSeconds > 0 ? <span>Try again in {blockedForSeconds}s</span> : null}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {success}
            </div>
          ) : null}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={!canVerify}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Verifying...' : 'Verify code'}
          </motion.button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0 || !pendingEmail}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleUseAnotherEmail}
              className="text-white/65 transition hover:text-white"
            >
              Use another email
            </button>
            <Link to="/login" className="text-emerald-300 transition hover:text-emerald-200">
              Back to login
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-300" />
            <p>
              If you already verified in another tab, just enter the latest code or go back to login and sign in again.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Verify

