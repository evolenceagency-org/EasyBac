import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { EMAIL_OTP_LENGTH, ensureValidRoute, isEmailVerified } from '../utils/authFlow.js'
import {
  getAuthErrorMessage,
  getPasswordStrength,
  validateEmail,
  validatePassword
} from '../utils/authValidation.js'

const Register = () => {
  const { signUp, user, profile, initialized, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : ''),
    [email, touched.email]
  )
  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : ''),
    [password, touched.password]
  )
  const strength = useMemo(() => getPasswordStrength(password), [password])

  const canSubmit =
    Boolean(email.trim() && password.trim()) &&
    !emailError &&
    !passwordError &&
    !submitting

  useEffect(() => {
    if (!initialized || authLoading || !user) return

    const safeRoute = ensureValidRoute({
      user,
      profile,
      currentPath: '/register'
    })

    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [authLoading, initialized, navigate, profile, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    const nextEmailError = validateEmail(normalizedEmail)
    const nextPasswordError = validatePassword(password)

    if (nextEmailError || nextPasswordError) {
      setError(nextEmailError || nextPasswordError)
      return
    }

    try {
      setSubmitting(true)
      const { data, error: signUpError } = await signUp(normalizedEmail, password)
      if (signUpError) throw signUpError

      setSuccess(`We sent a ${EMAIL_OTP_LENGTH}-digit verification code to ${normalizedEmail}.`)

      const signedUpUser = data?.user || data?.session?.user || null
      if (!signedUpUser || !isEmailVerified(signedUpUser)) {
        navigate('/verify', {
          replace: true,
          state: { email: normalizedEmail }
        })
        return
      }

      const safeRoute =
        ensureValidRoute({
          user: signedUpUser,
          profile,
          currentPath: '/register'
        }) || '/personalization'

      navigate(safeRoute, { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      label="Create account"
      title="Create your EasyBac account"
      subtitle="Start with your email and password, then confirm the account with a 6-digit code."
      sideTitle="Register, verify, continue"
      sideSubtitle="This flow creates the account first, verifies ownership with OTP, then moves directly into personalization and plan selection."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="text-[#c084fc]" to="/login">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="register-email" className="block text-xs font-medium text-white/70">
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <Mail className="h-4 w-4" />
            </span>
            <input
              id="register-email"
              type="email"
              autoFocus
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
                setSuccess('')
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
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

        <div className="space-y-2">
          <label htmlFor="register-password" className="block text-xs font-medium text-white/70">
            Password
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
              <Lock className="h-4 w-4" />
            </span>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
                setSuccess('')
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="At least 6 characters"
              className={`w-full rounded-2xl border bg-white/[0.03] py-3.5 pl-11 pr-12 text-sm text-white transition duration-200 outline-none ${
                passwordError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
                  : 'border-white/[0.08] focus:border-[#8b5cf6]/55 focus:ring-2 focus:ring-[#8b5cf6]/18'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/55 transition hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            {passwordError ? (
              <p className="text-red-300">{passwordError}</p>
            ) : (
              <span className="text-white/42">Use a password you&apos;ll remember.</span>
            )}
            <span className={strength.tone}>{strength.label}</span>
          </div>
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
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {submitting ? 'Creating account...' : 'Create account'}
        </motion.button>
      </form>
    </AuthCard>
  )
}

export default Register
