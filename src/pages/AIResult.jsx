import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BrainCircuit, ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 }
  }
}

const sectionVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 }
  }
}

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const AIResult = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const scoreValue = useMotionValue(0)
  const roundedScore = useTransform(scoreValue, (latest) => Math.round(latest))

  const ai = useMemo(() => {
    const snapshot = profile?.personalization?.ai
    return snapshot && typeof snapshot === 'object' ? snapshot : null
  }, [profile?.personalization?.ai])

  useEffect(() => {
    if (!ai) {
      navigate('/dashboard', { replace: true })
      return
    }
    const controls = animate(scoreValue, ai.score || 0, {
      duration: 1.1,
      ease: 'easeOut'
    })
    return () => controls.stop()
  }, [ai, navigate, scoreValue])

  if (!ai) return null

  const planItems = Array.isArray(ai.plan) && ai.plan.length > 0 ? ai.plan : []
  const metrics = ai.metrics || {}
  const predictions = ai.predictions || {}

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 md:gap-6 md:py-10"
      >
        <motion.header variants={sectionVariants} className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-cyan-200 backdrop-blur-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-4xl">
            Your AI Study Plan is Ready
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/65 md:text-[15px]">
            Profile-based score with live app data updates.
          </p>
        </motion.header>

        <motion.section
          variants={sectionVariants}
          className="rounded-2xl border border-white/8 bg-white/4 p-5 text-center backdrop-blur-lg"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Performance Score</p>
          <p className="mt-3 text-5xl font-bold tracking-tight text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.28)] md:text-6xl">
            <motion.span>{roundedScore}</motion.span>
          </p>
          <p className="mt-2 text-[11px] text-white/50">Updated: {ai.lastUpdated || 'today'}</p>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-lg md:grid-cols-4"
        >
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Weekly Study</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {metrics.weeklyStudyHours ?? 0}h
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Completion</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {Math.round((metrics.completionRate || 0) * 100)}%
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Active Days</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {metrics.activeDaysLast14 ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Overdue</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {metrics.overdueTasks ?? 0}
            </p>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-1 gap-3 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-lg md:grid-cols-3"
        >
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Optimal Session</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {predictions.optimalSessionLength?.minutes ?? '--'} min
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Drop Point</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {predictions.dropPoint?.minutes ?? '--'} min
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/18 p-3 text-center">
            <p className="text-[11px] text-white/50">Best Window</p>
            <p className="mt-1 text-base font-semibold tracking-tight text-white">
              {predictions.bestStudyTime?.window || '--'}
            </p>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-lg"
        >
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-cyan-300" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Analysis</p>
          </div>
          <p className="mt-3 text-sm leading-6 text-white/78 md:text-[15px]">{ai.analysis}</p>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-lg"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/50">Action Plan</p>
          <motion.ul variants={listVariants} className="mt-3 space-y-2.5">
            {planItems.map((item) => (
              <motion.li
                key={item}
                variants={listItemVariants}
                className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm leading-6 text-white/80 md:text-[15px]"
              >
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>

        <motion.button
          variants={sectionVariants}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard')}
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 px-8 py-3.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(139,92,246,0.22)] transition md:text-base"
        >
          Go to Dashboard
        </motion.button>
      </motion.div>
    </div>
  )
}

export default AIResult

