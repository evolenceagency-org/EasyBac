import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-zinc-900 to-zinc-800 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
          Start Today
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Create your account</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Join EasyBac to track your study progress.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
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
          <button
            type="submit"
            className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-900"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-300">
          Already have an account?{' '}
          <Link className="text-emerald-300" to="/login">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Register
