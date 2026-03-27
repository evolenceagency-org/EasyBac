import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  EMAIL_OTP_LENGTH,
  ensureValidRoute,
  persistPendingVerificationEmail
} from '../utils/authFlow.js'
import { getAuthErrorMessage, validateEmail } from '../utils/authValidation.js'

const Login = () => {
  const { signIn, user, profile, initialized } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState(false)
  const navigate = useNavigate()

  const emailError = useMemo(
    () => (touched ? validateEmail(email) : ''),
    [email, touched]
  )
  const canSubmit = Boolean(email.trim()) && !emailError && !loading

  useEffect(() => {
    if (!initialized || !user) return
    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/login' })
    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [initialized, navigate, profile, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched(true)
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    const nextEmailError = validateEmail(normalizedEmail)
    if (nextEmailError) {
      setError(nextEmailError)
      return
    }

    try {
      setLoading(true)
      const { error: otpError } = await signIn(normalizedEmail)
      if (otpError) throw otpError

      persistPendingVerificationEmail(normalizedEmail)
      setSuccess(`Your ${EMAIL_OTP_LENGTH}-digit code is on its way.`)
      navigate('/verify-code', {
        replace: true,
        state: { email: normalizedEmail }
      })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      label="Welcome back"
      title="Log in with your email code"
      subtitle="Enter your email and we’ll send a fresh verification code right away."
      sideTitle="Passwordless, fast, focused"
      sideSubtitle="No password resets, no magic links, just a quick OTP flow that gets you back into EasyBac."
      footer={
        <p>
          New here?{' '}
          <Link className="text-[#c084fc]" to="/register">
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="login-email" className="block text-xs font-medium text-white/70">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <Mail className="h-4 w-4" />
            </span>
            <input
              id="login-email"
              type="email"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
                setSuccess('')
              }}
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
              className={`w-full rounded-2xl border bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white transition duration-200 outline-none ${
                emailError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
                  : 'border-white/[0.08] focus:border-[#8b5cf6]/55 focus:ring-2 focus:ring-[#8b5cf6]/18'
              }`}
            />
          </div>
          {emailError ? <p className="text-xs text-red-300">{emailError}</p> : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {loading ? 'Sending code...' : 'Send login code'}
        </motion.button>
      </form>
    </AuthCard>
  )
}

export default Login
