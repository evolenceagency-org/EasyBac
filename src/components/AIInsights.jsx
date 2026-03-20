import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { analyzeUserData, buildInsightPrompt } from '../utils/aiInsights.js'
import { generateAIResponse } from '../services/aiService.js'

const containerMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.08 } }
}

const cardMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 }
}

const TYPE_STYLES = {
  warning: 'border-red-500/30 bg-red-500/10 text-red-100',
  focus: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  streak: 'border-violet-500/30 bg-violet-500/10 text-violet-100',
  positive: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
}

const AIInsights = ({ studySessions = [], tasks = [], streak }) => {
  const analysis = useMemo(
    () => analyzeUserData({ studySessions, tasks, streak }),
    [studySessions, tasks, streak]
  )

  const prompt = useMemo(
    () => buildInsightPrompt({ studySessions, tasks, streak }),
    [studySessions, tasks, streak]
  )

  const [aiText, setAiText] = useState('')
  const lastPromptRef = useRef('')

  useEffect(() => {
    let mounted = true
    if (!prompt || prompt === lastPromptRef.current) return
    lastPromptRef.current = prompt

    const run = async () => {
      const text = await generateAIResponse(prompt)
      if (!mounted) return
      setAiText(text || '')
    }

    run()

    return () => {
      mounted = false
    }
  }, [prompt])

  const hasData = useMemo(
    () => studySessions.length > 0 || tasks.length > 0,
    [studySessions.length, tasks.length]
  )

  const displayedInsights = useMemo(() => {
    const base = analysis?.insights || []
    if (!aiText) return base
    return [
      {
        type: 'positive',
        title: 'AI Summary',
        message: aiText,
        action: 'Apply one tip today'
      },
      ...base
    ].slice(0, 5)
  }, [aiText, analysis])

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 via-fuchsia-400/30 to-cyan-400/30 text-violet-100">
            <span className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl" />
          <svg
            viewBox="0 0 24 24"
              className="relative h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2a6 6 0 0 0-3.2 11.1c.2.1.3.3.3.5V16a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2.4c0-.2.1-.4.3-.5A6 6 0 0 0 12 2zm-1 18h2a1 1 0 0 1 0 2h-2a1 1 0 0 1 0-2z" />
          </svg>
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              AI Analysis
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              Real-time performance insights
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border border-white/10 bg-white/5 text-center">
            <p className="text-lg font-semibold text-white">
              {analysis?.score ?? 0}
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              /100
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              Status
            </p>
            <p className="text-sm font-semibold text-white">
              {analysis?.status || 'Needs Focus'}
            </p>
          </div>
        </div>
      </div>

      {!hasData && (
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          No data yet. Start studying to unlock insights.
        </div>
      )}

      {hasData && (
        <motion.div
          variants={containerMotion}
          initial="initial"
          animate="animate"
          className="mt-6 grid gap-3 md:grid-cols-2"
        >
          {displayedInsights.map((insight, index) => (
            <motion.div
              key={`${insight.title}-${index}`}
              variants={cardMotion}
              whileHover={{ scale: 1.02 }}
              className={`rounded-xl border px-4 py-4 text-sm shadow-sm transition ${TYPE_STYLES[insight.type] || 'border-white/10 bg-white/5 text-zinc-200'}`}
            >
              <p className="text-sm font-semibold text-white">{insight.title}</p>
              <p className="mt-2 text-xs text-zinc-200">{insight.message}</p>
              <p className="mt-3 text-xs font-semibold text-white/90">
                {insight.action}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default AIInsights
