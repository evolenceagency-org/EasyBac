import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AuthCard from '../components/AuthCard.jsx'
import {
  getAuthErrorMessage,
  validateEmail,
  validatePassword
} from '../utils/authValidation.js'

const Login = () => {
  const { signIn, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false })
  const navigate = useNavigate()
  const location = useLocation()

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : ''),
    [email, touched.email]
  )
  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : ''),
    [password, touched.password]
  )

  const canSubmit = useMemo(
    () => !emailError && !passwordError && !loading,
    [emailError, passwordError, loading]
  )

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setTouched({ email: true, password: true })

    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (emailValidation || passwordValidation) {
      setError(emailValidation || passwordValidation)
      return
    }

    try {
      setLoading(true)
      const { error: signInError } = await signIn(email, password)
      if (signInError) {
        throw signInError
      }
      setSuccess('Welcome back 👋')
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
      return
    } finally {
      setLoading(false)
    }

    const redirectTo = location.state?.from?.pathname || '/dashboard'
    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthCard
      label="Welcome back"
      title="Login to EasyBac"
      subtitle="Continue your preparation journey with smarter tracking."
      sideTitle="A clearer path to Bac success"
      sideSubtitle="Track deep study sessions, focus streaks, and insights that help you improve every week."
      footer={
        <p>
          No account yet?{' '}
          <Link className="text-emerald-300" to="/register">
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label
            htmlFor="login-email"
            className="block text-xs font-medium text-white/70"
          >
            Email
          </label>
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
              setSuccess('')
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
            onFocus={() => setTouched((prev) => ({ ...prev, email: true }))}
            placeholder="you@example.com"
            autoFocus
            className={`w-full rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-all duration-300 focus:outline-none focus:ring-2 ${
              emailError
                ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
                : 'border-white/10 focus:border-purple-400 focus:ring-purple-500/40'
            }`}
          />
          {emailError && (
            <p className="text-xs text-red-300">{emailError}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
                setSuccess('')
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
              onFocus={() => setTouched((prev) => ({ ...prev, password: true }))}
              onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))}
              placeholder="Password"
              className={`w-full rounded-xl border bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 transition-all duration-300 focus:outline-none focus:ring-2 ${
                passwordError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40'
                  : 'border-white/10 focus:border-purple-400 focus:ring-purple-500/40'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-red-300">{passwordError}</p>
          )}
          {capsLock && (
            <p className="text-xs text-amber-200">Caps Lock is on</p>
          )}
        </div>
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          disabled={!canSubmit}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Processing...' : 'Login'}
        </motion.button>
      </form>

      <div className="mt-6">
        <div className="flex items-center gap-4 text-xs text-white/50">
          <span className="h-px flex-1 bg-white/10" />
          OR
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-white/70 transition-all duration-300 hover:border-white/20"
          disabled
        >
          Continue with Google (soon)
        </button>
      </div>
    </AuthCard>
  )
}

export default Login
