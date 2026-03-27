import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import OtpCodeInput from '../components/auth/OtpCodeInput.jsx'
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

const statusPanelMotion = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.14, ease: 'easeOut' } }
}

const Verify = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, initialized, sendVerificationCode, verifyCode } = useAuth()

  const [pendingEmail, setPendingEmail] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(OTP_COOLDOWN_SECONDS)
  const [resendCount, setResendCount] = useState(0)
  const [attemptState, setAttemptState] = useState({ attempts: 0, blockedUntil: 0 })
  const [attemptTick, setAttemptTick] = useState(Date.now())

  const submittedCodeRef = useRef('')
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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
  }, [attemptState.blockedUntil, attemptTick, pendingEmail])

  useEffect(() => {
    if (!initialized || status !== 'idle' || !user || !isEmailVerified(user)) return
    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/verify-code' })
    if (safeRoute) {
      navigate(safeRoute || '/dashboard', { replace: true })
    }
  }, [initialized, navigate, profile, status, user])

  const blockedForSeconds = useMemo(() => {
    if (!attemptState.blockedUntil) return 0
    return Math.max(0, Math.ceil((attemptState.blockedUntil - Date.now()) / 1000))
  }, [attemptState.blockedUntil, attemptTick])

  const canResend = Boolean(pendingEmail && cooldown === 0 && status !== 'verifying')
  const spamHintVisible = resendCount >= 2
  const helperText =
    status === 'verifying'
      ? 'Checking your code...'
      : status === 'success'
        ? 'Code accepted. Taking you in...'
        : `Enter the ${EMAIL_OTP_LENGTH}-digit code we sent to ${pendingEmail || 'your email'}.`

  const finishVerification = async (fullCode) => {
    const normalizedEmail = pendingEmail.trim().toLowerCase()
    const emailError = validateEmail(normalizedEmail)

    if (emailError) {
      setError(emailError)
      setStatus('error')
      return
    }

    if (blockedForSeconds > 0) {
      setError(`Too many attempts. Try again in ${blockedForSeconds}s.`)
      setStatus('error')
      return
    }

    setStatus('verifying')
    setError('')

    const nextAttempts = attemptState.attempts + 1
    const blockedUntil =
      nextAttempts >= OTP_MAX_ATTEMPTS ? Date.now() + OTP_ATTEMPT_WINDOW_MS : 0
    const snapshot = { attempts: nextAttempts, blockedUntil, updatedAt: Date.now() }
    saveAttemptState(normalizedEmail, snapshot)
    setAttemptState(snapshot)

    try {
      const verified = await verifyCode(normalizedEmail, fullCode)
      saveAttemptState(normalizedEmail, { attempts: 0, blockedUntil: 0, updatedAt: Date.now() })
      clearPendingVerificationEmail()
      setStatus('success')

      const safeRoute = ensureValidRoute({
        user: verified?.user || user,
        profile: verified?.profile || profile,
        currentPath: '/verify-code'
      })

      window.setTimeout(() => {
        if (!mountedRef.current) return
        navigate(safeRoute || '/dashboard', { replace: true })
      }, 520)
    } catch (verifyError) {
      submittedCodeRef.current = ''
      setStatus('error')
      setError(getAuthErrorMessage(verifyError))
    }
  }

  useEffect(() => {
    if (
      code.length !== EMAIL_OTP_LENGTH ||
      status !== 'idle' ||
      blockedForSeconds > 0 ||
      !pendingEmail
    ) {
      return
    }

    if (submittedCodeRef.current === code) return
    submittedCodeRef.current = code
    void finishVerification(code)
  }, [blockedForSeconds, code, pendingEmail, status])

  const handleCodeChange = (nextCode) => {
    if (submittedCodeRef.current && nextCode !== submittedCodeRef.current) {
      submittedCodeRef.current = ''
    }
    if (status === 'error') {
      setStatus('idle')
      setError('')
    }
    setCode(nextCode)
  }

  const handleResend = async () => {
    if (!canResend) return

    setStatus('idle')
    setError('')
    setCode('')
    submittedCodeRef.current = ''

    try {
      await sendVerificationCode(pendingEmail)
      setResendCount((value) => value + 1)
      setCooldown(OTP_COOLDOWN_SECONDS)
    } catch (resendError) {
      setStatus('error')
      setError(getAuthErrorMessage(resendError))
    }
  }

  const handleUseAnotherEmail = () => {
    clearPendingVerificationEmail()
    navigate('/register', { replace: true })
  }

  if (!pendingEmail && !user?.email) {
    return (
      <AuthCard
        label="Verification"
        title="We need your email first"
        subtitle="Start by requesting a one-time code so we know which account to verify."
        sideTitle="One-time code sign in"
        sideSubtitle="EasyBac now uses email codes only. Request a fresh OTP and continue in one quick step."
        footer={
          <p>
            Ready to start?{' '}
            <Link className="text-[#c084fc]" to="/register">
              Request a code
            </Link>
          </p>
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-white/72">
            We couldn’t find a pending verification session. Start from login or register and we’ll send a new code instantly.
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/register', { replace: true })}
              className="flex-1 rounded-xl bg-[#8b5cf6] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed]"
            >
              Request code
            </button>
            <button
              type="button"
              onClick={() => navigate('/login', { replace: true })}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm font-medium text-white/78 transition hover:bg-white/[0.05]"
            >
              Back to login
            </button>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      label="Email code"
      title="Enter your verification code"
      subtitle="Fast, passwordless access. We’ll verify the code and continue automatically."
      sideTitle="A cleaner OTP flow"
      sideSubtitle="One secure code, one focused screen, and no extra steps. Built for quick verification on mobile and desktop."
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleUseAnotherEmail}
            className="text-sm text-white/55 transition hover:text-white"
          >
            Use another email
          </button>
          <span className="text-xs text-white/40">OTP only — no magic links</span>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
            <Mail className="h-4 w-4 text-white/80" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Sending to</p>
            <p className="truncate text-sm font-medium text-white/88">{pendingEmail}</p>
          </div>
        </div>

        <motion.div
          key={status === 'error' ? `error-${error}` : 'stable'}
          animate={
            status === 'error'
              ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
              : { x: 0 }
          }
          transition={{ duration: 0.38, ease: 'easeOut' }}
          className="space-y-4"
        >
          <OtpCodeInput
            value={code}
            length={EMAIL_OTP_LENGTH}
            disabled={status === 'verifying' || status === 'success'}
            invalid={status === 'error'}
            onChange={handleCodeChange}
          />

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={status}
              variants={statusPanelMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`rounded-2xl border px-4 py-3 text-sm ${
                status === 'error'
                  ? 'border-red-500/20 bg-red-500/10 text-red-200'
                  : status === 'success'
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/70'
              }`}
            >
              <div className="flex items-center gap-3">
                {status === 'verifying' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[#c084fc]" />
                ) : status === 'success' ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0.65 }}
                    animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                    transition={{ duration: 0.32, ease: 'easeOut' }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15"
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                  </motion.div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.04]">
                    <ShieldCheck className="h-4 w-4 text-white/65" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-white">{helperText}</p>
                  {status === 'error' && error ? (
                    <p className="mt-1 text-red-200">{error}</p>
                  ) : status === 'idle' ? (
                    <p className="mt-1 text-white/48">
                      We’ll verify as soon as the last digit is entered.
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-white/78 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <RefreshCw className="h-4 w-4" />
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>

          <div className="text-right text-xs text-white/42">
            {blockedForSeconds > 0 ? (
              <p>Locked for {blockedForSeconds}s after too many attempts</p>
            ) : spamHintVisible ? (
              <p>Still nothing? Check spam or promotions.</p>
            ) : (
              <p>Didn’t get it? You can resend in 30s.</p>
            )}
          </div>
        </div>
      </div>
    </AuthCard>
  )
}

export default Verify
