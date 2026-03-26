import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Copy, Check, X, HeartHandshake } from 'lucide-react'

const DonateModal = ({ open, onClose, rib }) => {
  const [copied, setCopied] = useState(false)
  const resetTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    if (!rib) return
    try {
      await navigator.clipboard.writeText(rib)
      setCopied(true)
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Failed to copy RIB', error)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
        >
          <button
            type="button"
            aria-label="Close modal background"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.92)] p-6 shadow-[0_10px_50px_rgba(0,0,0,0.65)] backdrop-blur-xl"
          >
            <AnimatePresence>
              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                >
                  RIB copied
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/25 to-green-500/20">
                <HeartHandshake className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Support the project</h3>
                <p className="text-xs text-white/60">
                  You can support this project via bank transfer using the RIB below.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-white/55">RIB</p>
              <p className="break-all text-sm font-medium text-white">{rib || 'RIB not configured yet.'}</p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!rib}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? 'RIB copied' : 'Copy RIB'}
            </button>

            <p className="mt-3 text-xs text-white/55">
              Send proof via WhatsApp or email for confirmation.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default DonateModal

