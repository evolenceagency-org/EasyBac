import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const fullResponse =
  "Sure — use the identity sin^2(x) = (1 - cos(2x)) / 2, then integrate step by step."

const AISection = () => {
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    let index = 0
    let timerId

    const tick = () => {
      index += 1
      setTypedText(fullResponse.slice(0, index))
      if (index >= fullResponse.length) {
        clearInterval(timerId)
        timerId = setTimeout(() => {
          index = 0
          setTypedText('')
          timerId = setInterval(tick, 45)
        }, 2000)
      }
    }

    timerId = setInterval(tick, 45)

    return () => {
      clearInterval(timerId)
    }
  }, [])

  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/20 to-cyan-500/20" />
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="space-y-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-300">
            AI Tutor
          </p>
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Your AI study partner, 24/7
          </h2>
          <p className="text-sm text-zinc-200 sm:text-base">
            Ask for help, get instant explanations, and receive next-step
            prompts tailored to your current streak.
          </p>
          <ul className="space-y-3 text-sm text-zinc-200">
            <li>Multi-format questions (text + voice)</li>
            <li>Instant concept breakdowns</li>
            <li>Exam-ready summaries</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="glass rounded-3xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 text-xs uppercase tracking-[0.3em] text-zinc-400">
            BacTracker AI Session
          </div>
          <div className="mt-4 space-y-4 text-sm">
            <div className="w-fit rounded-2xl rounded-tl-none bg-white/5 px-4 py-3">
              How do I solve the integral of sin^2(x)?
            </div>
            <div className="ml-auto w-fit max-w-xs rounded-2xl rounded-tr-none border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
              {typedText}
              <span className="ml-1 inline-block h-3 w-[2px] animate-pulse bg-emerald-300 align-middle" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default AISection
