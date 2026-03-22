import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import AuthCard from '../components/AuthCard.jsx'

const Register = () => {
  const { signUp, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const { data, error: signUpError } = await signUp(email, password)
    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data?.session) {
      setNotice('Check your email to confirm your account, then log in.')
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <AuthCard
      label="Start today"
      title="Create your account"
      subtitle="Join EasyBac to track your study progress with clarity."
      sideTitle="Build momentum from day one"
      sideSubtitle="Your Bac journey becomes easier when the plan is clear and measurable."
      footer={
        <p>
          Already have an account?{' '}
          <Link className="text-emerald-300" to="/login">
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-all duration-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-all duration-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          required
        />
        {notice && (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        )}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          type="submit"
          className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]"
        >
          Create Account
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

export default Register
