import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.14, delayChildren: 0.08 }
  }
}

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 }
  }
}

const listItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const WelcomeAI = () => {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const scoreValue = useMotionValue(0)
  const roundedScore = useTransform(scoreValue, (latest) => Math.round(latest))

  const aiPlan = useMemo(() => {
    const plan = profile?.personalization?.ai
    if (plan && typeof plan === 'object') return plan
    return null
  }, [profile?.personalization?.ai])

  useEffect(() => {
    if (!aiPlan) {
      navigate('/dashboard', { replace: true })
      return
    }

    const controls = animate(scoreValue, aiPlan.score || 0, {
      duration: 1.1,
      ease: 'easeOut'
    })
    return () => controls.stop()
  }, [aiPlan, navigate, scoreValue])

  if (!aiPlan) return null

  const planItems = Array.isArray(aiPlan.plan) && aiPlan.plan.length > 0
    ? aiPlan.plan
    : [
        'Study at least 2 focused hours daily',
        'Prioritize your weakest subject first',
        'Finish with 15 minutes of active recall'
      ]

  return (
    <div className="relative min-h-[calc(100vh-2rem)] overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12"
      >
        <motion.div variants={sectionVariants} className="text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-200 backdrop-blur-xl">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold md:text-5xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Your AI Study Plan is Ready
          </h1>
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-xl"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Performance Score</p>
          <p className="mt-3 text-6xl font-bold text-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.6)] md:text-7xl">
            <motion.span>{roundedScore}</motion.span>
          </p>
        </motion.div>

        <motion.div variants={sectionVariants} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Analysis</p>
          <p className="mt-3 text-sm leading-relaxed text-white/85 md:text-base">
            {aiPlan.analysis}
          </p>
        </motion.div>

        <motion.div variants={sectionVariants} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Action Plan</p>
          <motion.ul variants={listVariants} className="mt-3 space-y-2.5">
            {planItems.map((item) => (
              <motion.li
                key={item}
                variants={listItemVariants}
                className="flex items-start gap-2 rounded-lg bg-white/5 px-3 py-2.5 text-sm text-white/85 md:text-base"
              >
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <span>{item}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.button
          variants={sectionVariants}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/dashboard', { state: { fromOnboarding: true } })}
          className="w-full rounded-xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 px-8 py-4 text-sm font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.6)] transition md:text-base"
        >
          Go to Dashboard
        </motion.button>
      </motion.div>
    </div>
  )
}

export default WelcomeAI

