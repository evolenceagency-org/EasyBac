import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MailCheck, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient.js'

const Verify = () => {
  const navigate = useNavigate()
  const [pendingEmail, setPendingEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPendingEmail(sessionStorage.getItem('pendingEmail') || '')
    }
  }, [])

  const handleCheck = async () => {
    setError('')
    setChecking(true)
    try {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        throw sessionError
      }
      if (data?.session) {
        navigate('/pricing', { replace: true })
        return
      }
      setError('Email not verified yet. Please check again.')
    } catch (err) {
      setError('Unable to check verification. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#0a0d1a] to-[#1b0d2a] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-purple-500/25 blur-3xl" />
        <div className="absolute right-0 top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/40 to-blue-500/40 shadow-[0_0_25px_rgba(139,92,246,0.35)]">
          <MailCheck className="h-6 w-6 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-white/70">
          We sent a confirmation link{pendingEmail ? ` to ${pendingEmail}` : ''}. Please verify your account before continuing.
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] transition-all duration-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          {checking ? 'Checking...' : 'I have verified my email'}
        </button>
      </motion.div>
    </div>
  )
}

export default Verify
