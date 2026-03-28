import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getAuthenticatedHomeRoute, isEmailVerified, persistPendingVerificationEmail } from '../utils/authFlow.js'
import { getAuthErrorMessage, validateEmail, validatePassword } from '../utils/authValidation.js'

const Login = () => {
  const { signIn, user, profile, initialized, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : ''),
    [email, touched.email]
  )
  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : ''),
    [password, touched.password]
  )

  const canSubmit =
    Boolean(email.trim() && password.trim()) &&
    !emailError &&
    !passwordError &&
    !submitting

  useEffect(() => {
    if (!initialized || authLoading || !user) return

    const safeRoute = getAuthenticatedHomeRoute({ user, profile })

    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [authLoading, initialized, navigate, profile, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched({ email: true, password: true })
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const nextEmailError = validateEmail(normalizedEmail)
    const nextPasswordError = validatePassword(password)

    if (nextEmailError || nextPasswordError) {
      setError(nextEmailError || nextPasswordError)
      return
    }

    try {
      setSubmitting(true)
      const { data, error: signInError } = await signIn(normalizedEmail, password)
      if (signInError) throw signInError

      const authUser = data?.user || data?.session?.user || null
      const authProfile = data?.profile || profile

      if (!authUser) {
        throw new Error('Invalid login credentials')
      }

      if (!isEmailVerified(authUser)) {
        persistPendingVerificationEmail(normalizedEmail)
        navigate('/verify', {
          replace: true,
          state: { email: normalizedEmail }
        })
        return
      }

      const redirectTo =
        getAuthenticatedHomeRoute({ user: authUser, profile: authProfile }) ||
        location.state?.from?.pathname ||
        '/dashboard'

      navigate(redirectTo, { replace: true })
    } catch (authError) {
      if (/Email not confirmed/i.test(authError?.message || '')) {
        persistPendingVerificationEmail(normalizedEmail)
        navigate('/verify', {
          replace: true,
          state: { email: normalizedEmail }
        })
        return
      }

      setError(getAuthErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      label="Welcome back"
      title="Log in to EasyBac"
      subtitle="Use your email and password to continue from exactly the right next step."
      sideEyebrow="Login"
      sideTitle="No mixed auth flow"
      sideSubtitle="Login only signs you in. If setup is incomplete, we guide you to the next required screen automatically."
      supportPoints={[
        'Wrong password? We tell you clearly.',
        'Email not verified? We send you straight to code verification.'
      ]}
      backTo="/"
      backLabel="Home"
      progressText="Existing account"
      footer={
        <p>
          Need an account first?{' '}
          <Link className="text-[#c084fc]" to="/register">
            Create one
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
          <label htmlFor="login-password" className="block text-xs font-medium text-white/70">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
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

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.985 }}
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {submitting ? 'Logging in...' : 'Log in'}
        </motion.button>
      </form>
    </AuthCard>
  )
}

export default Login
