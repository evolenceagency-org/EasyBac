import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { paymentPhone } from '../config/paymentConfig.js'

const Contact = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [sending, setSending] = useState(false)

  const phone = useMemo(() => {
    const raw = paymentPhone || ''
    return raw.replace(/[^\d]/g, '')
  }, [paymentPhone])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (sending) return

    setError('')
    setStatus('')

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill out name, email, and message.')
      return
    }
    if (!phone) {
      setError('WhatsApp contact is not configured yet.')
      return
    }

    setSending(true)
    const composed = `New message from BacTracker:\n\nName: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`
    const encoded = encodeURIComponent(composed)
    const url = `https://wa.me/${phone}?text=${encoded}`

    window.open(url, '_blank', 'noopener,noreferrer')
    setStatus('Redirecting to WhatsApp...')
    setName('')
    setEmail('')
    setMessage('')
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <div className="px-6 pb-16 pt-12 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl"
        >
          <h1 className="text-2xl font-semibold">Contact Us</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Have a question or need help? Send us a message.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
            />
            <textarea
              rows={5}
              placeholder="Message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-400"
            />
            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          {status && (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              {status}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default Contact
