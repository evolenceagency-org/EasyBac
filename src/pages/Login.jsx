import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  EMAIL_OTP_LENGTH,
  ensureValidRoute,
  isEmailVerified,
  persistPendingVerificationEmail
} from '../utils/authFlow.js'
import {
  getAuthErrorMessage,
  validateEmail,
  validatePassword
} from '../utils/authValidation.js'

const Login = () => {
  const { signIn, requestLoginOtp, signOut, user, profile, initialized, refreshAuthState } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
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
  const canSubmit = Boolean(email.trim() && password.trim()) && !emailError && !passwordError && !loading
  const canRequestOtp = Boolean(email.trim()) && !validateEmail(email) && !otpLoading

  useEffect(() => {
    if (!initialized || !user) return
    const normalizedInput = email.trim().toLowerCase()
    const authenticatedEmail = user.email?.trim().toLowerCase() || ''

    if (normalizedInput && authenticatedEmail && normalizedInput !== authenticatedEmail) {
      return
    }

    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/login' })
    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [email, initialized, navigate, profile, user])

  const handlePasswordLogin = async (event) => {
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
      setLoading(true)

      if (user?.email && user.email.toLowerCase() !== normalizedEmail) {
        await signOut()
      }

      const { data, error: signInError } = await signIn(normalizedEmail, password)
      if (signInError) throw signInError

      const authUser = data?.user || data?.session?.user || null
      if (!authUser || authUser.email?.trim().toLowerCase() !== normalizedEmail) {
        await signOut()
        throw new Error('Invalid login credentials')
      }

      if (!isEmailVerified(authUser)) {
        persistPendingVerificationEmail(normalizedEmail, 'signup')
        navigate('/verify', {
          replace: true,
          state: { email: normalizedEmail, flow: 'signup' }
        })
        return
      }

      const refreshed = await refreshAuthState()
      if (!refreshed?.user || refreshed.user.email?.trim().toLowerCase() !== normalizedEmail) {
        await signOut()
        throw new Error('Invalid login credentials')
      }

      const redirectTo =
        ensureValidRoute({
          user: refreshed.user,
          profile: refreshed.profile || profile,
          currentPath: location.state?.from?.pathname || '/login'
        }) ||
        location.state?.from?.pathname ||
        '/dashboard'

      navigate(redirectTo, { replace: true })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  const handleOtpLogin = async () => {
    setTouched((prev) => ({ ...prev, email: true }))
    setError('')
    setSuccess('')

    const normalizedEmail = email.trim().toLowerCase()
    const nextEmailError = validateEmail(normalizedEmail)
    if (nextEmailError) {
      setError(nextEmailError)
      return
    }

    try {
      setOtpLoading(true)
      const { error: otpError } = await requestLoginOtp(normalizedEmail)
      if (otpError) throw otpError

      setSuccess(`We sent a ${EMAIL_OTP_LENGTH}-digit login code to ${normalizedEmail}.`)
      navigate('/verify', {
        replace: true,
        state: { email: normalizedEmail, flow: 'otp-login' }
      })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <AuthCard
      label="Welcome back"
      title="Log in to EasyBac"
      subtitle="Use your password as the default path, or request a one-time code when you need it."
      sideTitle="Password first, OTP when needed"
      sideSubtitle="This keeps login predictable, avoids accidental account creation, and still gives you a secure fallback."
      footer={
        <p>
          Need an account first?{' '}
          <Link className="text-[#c084fc]" to="/register">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handlePasswordLogin} className="space-y-5">
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
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="login-password" className="block text-xs font-medium text-white/70">
              Password
            </label>
            <button
              type="button"
              onClick={handleOtpLogin}
              disabled={!canRequestOtp}
              className="text-xs text-[#c084fc] transition hover:text-[#d8b4fe] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {otpLoading ? 'Sending code...' : 'Use email code instead'}
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
                setSuccess('')
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              placeholder="Your password"
              className={`w-full rounded-2xl border bg-white/[0.03] py-3.5 pl-4 pr-12 text-sm text-white transition duration-200 outline-none ${
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
          {passwordError ? <p className="text-xs text-red-300">{passwordError}</p> : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>{success}</span>
            </div>
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
          {loading ? 'Logging in...' : 'Log in'}
        </motion.button>
      </form>
    </AuthCard>
  )
}

export default Login
