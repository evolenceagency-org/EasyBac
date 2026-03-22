import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareText, CheckCircle2 } from 'lucide-react'
import CustomSelect from '../components/CustomSelect.jsx'

const typeOptions = [
  { label: 'Question', value: 'question' },
  { label: 'Bug Report', value: 'bug-report' },
  { label: 'Feature Request', value: 'feature-request' },
  { label: 'Payment Issue', value: 'payment-issue' }
]

const quickPills = [
  { label: 'Report a bug', value: 'bug-report' },
  { label: 'Suggest a feature', value: 'feature-request' },
  { label: 'Ask a question', value: 'question' }
]

const SuccessState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col items-center text-center"
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
        <CheckCircle2 className="h-6 w-6 text-emerald-300" />
      </div>
      <h2 className="text-2xl font-semibold text-white">Message sent successfully</h2>
      <p className="mt-2 text-sm text-white/70">We'll get back to you soon</p>
    </motion.div>
  )
}

const SupportForm = ({
  name,
  setName,
  email,
  setEmail,
  type,
  setType,
  message,
  setMessage,
  loading,
  canSubmit,
  onSubmit,
  error
}) => {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 overflow-visible">
      <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
        {quickPills.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => setType(pill.value)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-all duration-300 ${
              type === pill.value
                ? 'border-purple-400 bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-white'
                : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name (optional)"
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/45 transition-all duration-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      />

      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        required
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/45 transition-all duration-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      />

      <CustomSelect value={type} onChange={setType} options={typeOptions} />

      <textarea
        rows={5}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Describe your issue or idea..."
        required
        className="relative z-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/45 transition-all duration-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.32)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Send Message'}
      </button>

      <p className="text-center text-xs text-white/60">We usually respond within 24h</p>

      {error && (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </form>
  )
}

const SupportPage = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [type, setType] = useState('question')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(
    () => Boolean(email.trim() && message.trim()) && !loading,
    [email, message, loading]
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email.trim() || !message.trim()) {
      setError('Please provide your email and message.')
      return
    }

    setLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    /*
    await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        type,
        message
      })
    })
    */

    setLoading(false)
    setSuccess(true)
    setName('')
    setEmail('')
    setType('question')
    setMessage('')
  }

  return (
    <div className="min-h-screen overflow-visible bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="relative overflow-visible px-6 pb-16 pt-12 md:px-12">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.14),transparent_35%)]" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="mx-auto w-full max-w-xl overflow-visible rounded-3xl border border-white/10 bg-white/5 p-7 shadow-[0_0_60px_rgba(139,92,246,0.15)] backdrop-blur-xl"
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-purple-500/35 to-blue-500/35 shadow-[inset_0_1px_12px_rgba(255,255,255,0.2),0_0_18px_rgba(139,92,246,0.25)]">
              <MessageSquareText className="h-5 w-5 text-purple-100" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Support Center</h1>
            <p className="mt-2 text-sm text-white/70">
              Got a question, idea, or issue? Send us a message.
            </p>
          </div>

          {success ? (
            <SuccessState />
          ) : (
            <SupportForm
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              type={type}
              setType={setType}
              message={message}
              setMessage={setMessage}
              loading={loading}
              canSubmit={canSubmit}
              onSubmit={handleSubmit}
              error={error}
            />
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default SupportPage
