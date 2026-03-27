import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import AuthCard from '../components/AuthCard.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { EMAIL_OTP_LENGTH, ensureValidRoute } from '../utils/authFlow.js'
import { getAuthErrorMessage, validateEmail } from '../utils/authValidation.js'

const Register = () => {
  const { signUp, user, profile, initialized } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [touched, setTouched] = useState(false)

  const emailError = useMemo(
    () => (touched ? validateEmail(email) : ''),
    [email, touched]
  )

  const canSubmit = Boolean(email.trim()) && !emailError && !loading

  useEffect(() => {
    if (!initialized || !user) return
    const safeRoute = ensureValidRoute({ user, profile, currentPath: '/register' })
    if (safeRoute) {
      navigate(safeRoute, { replace: true })
    }
  }, [initialized, navigate, profile, user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setTouched(true)
    setError('')
    setSuccess('')

    const nextEmail = email.trim().toLowerCase()
    const nextEmailError = validateEmail(nextEmail)
    if (nextEmailError) {
      setError(nextEmailError)
      return
    }

    try {
      setLoading(true)
      const { error: otpError } = await signUp(nextEmail)
      if (otpError) throw otpError

      setSuccess(`We sent a ${EMAIL_OTP_LENGTH}-digit verification code to ${nextEmail}.`)
      navigate('/verify-code', {
        replace: true,
        state: { email: nextEmail }
      })
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      label="Create account"
      title="Start with your email"
      subtitle="We’ll send a one-time code instantly. No password, no magic link, no friction."
      sideTitle="Onboarding in one fast step"
      sideSubtitle="Request a secure code, verify it, and continue straight into your plan setup."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="text-[#c084fc]" to="/login">
            Log in with code
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
              onBlur={() => setTouched(true)}
              placeholder="you@example.com"
              className={`w-full rounded-2xl border bg-white/[0.03] py-3.5 pl-11 pr-4 text-sm text-white transition duration-200 outline-none ${
                emailError
                  ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/30'
                  : 'border-white/[0.08] focus:border-[#8b5cf6]/55 focus:ring-2 focus:ring-[#8b5cf6]/18'
              }`}
            />
          </div>
          <p className="text-xs text-white/42">We’ll create your account automatically if it doesn’t exist yet.</p>
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
          {loading ? 'Sending code...' : 'Continue with email code'}
        </motion.button>
      </form>
    </AuthCard>
  )
}

export default Register
