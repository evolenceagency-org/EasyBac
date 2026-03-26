import { useEffect, useMemo, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  XCircle
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  loadLatestExamResult,
  mergeExamResultIntoPersonalization,
  saveExamResult
} from '../utils/examEngine.ts'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 }
  }
}

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
}

const listItemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const statCard = 'rounded-2xl border border-white/8 bg-black/18 p-4 backdrop-blur-lg'

const ExamResult = () => {
  const { profile, user, profileLoading, updatePersonalization } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const scoreValue = useMotionValue(0)
  const roundedScore = useTransform(scoreValue, (latest) => Math.round(latest))
  const persistedRef = useRef(false)

  const result = useMemo(() => {
    const stateResult = location.state?.result
    if (stateResult) return stateResult
    if (!user?.id) return null
    return loadLatestExamResult(user.id)
  }, [location.state?.result, user?.id])

  useEffect(() => {
    if (profileLoading) return
    if (!result) {
      navigate('/dashboard', { replace: true })
      return
    }

    const controls = animate(scoreValue, result.overallScore || 0, {
      duration: 1.2,
      ease: 'easeOut'
    })

    return () => controls.stop()
  }, [navigate, profileLoading, result, scoreValue])

  useEffect(() => {
    if (!result || !user?.id || persistedRef.current) return
    persistedRef.current = true

    saveExamResult(user.id, result)
    const merged = mergeExamResultIntoPersonalization(profile?.personalization || profile || {}, result)
    updatePersonalization(merged).catch(() => {
      persistedRef.current = false
    })
  }, [profile, result, updatePersonalization, user?.id])

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-white/70 backdrop-blur-xl">
          Loading result...
        </div>
      </div>
    )
  }

  if (!result) return null

  const planItems = Array.isArray(result.improvementPlan) ? result.improvementPlan : []
  const feedbackItems = Array.isArray(result.feedback) ? result.feedback : []
  const weakTopics = Array.isArray(result.weakTopics) ? result.weakTopics : []
  const strongTopics = Array.isArray(result.strongTopics) ? result.strongTopics : []
  const breakdown = Array.isArray(result.breakdown) ? result.breakdown : []

  const handleRetry = () => {
    navigate('/exam-simulation', {
      state: {
        subject: result.subject || 'auto',
        durationMinutes: result.nextSessionMinutes || result.durationMinutes || 90,
        difficulty: 'auto',
        autoStart: true
      }
    })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black text-white">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 md:gap-6 md:py-10"
      >
        <motion.header variants={sectionVariants} className="text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/4 text-cyan-200 backdrop-blur-lg">
            <Trophy className="h-5 w-5" />
          </div>
          <h1 className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent md:text-4xl">
            Exam Simulation Complete
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/65 md:text-[15px]">
            Strict evaluation of pacing, stability, and topic control.
          </p>
        </motion.header>

        <motion.section
          variants={sectionVariants}
          className="rounded-3xl border border-white/8 bg-white/4 p-5 text-center backdrop-blur-lg"
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Overall score</p>
          <p className="mt-3 text-5xl font-bold tracking-tight text-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.28)] md:text-6xl">
            <motion.span>{roundedScore}</motion.span>
          </p>
          <p className="mt-2 text-sm text-white/55">{result.subjectLabel} • {result.difficulty}</p>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-2 gap-3 rounded-3xl border border-white/8 bg-white/4 p-4 backdrop-blur-lg md:grid-cols-4"
        >
          <div className={statCard}>
            <p className="text-[11px] text-white/45">Accuracy</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">{result.accuracyScore}%</p>
          </div>
          <div className={statCard}>
            <p className="text-[11px] text-white/45">Time efficiency</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">{result.timeEfficiency}%</p>
          </div>
          <div className={statCard}>
            <p className="text-[11px] text-white/45">Stability</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">{result.stabilityScore}%</p>
          </div>
          <div className={statCard}>
            <p className="text-[11px] text-white/45">Completion</p>
            <p className="mt-1 text-xl font-semibold tracking-tight text-white">
              {Math.round((result.completionRate || 0) * 100)}%
            </p>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-1 gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-2xl md:grid-cols-3"
        >
          <div className={statCard}>
            <p className="text-xs text-white/55">Average per question</p>
            <p className="mt-1 text-lg font-semibold text-white">{Math.round(result.averageSecondsPerQuestion || 0)}s</p>
          </div>
          <div className={statCard}>
            <p className="text-xs text-white/55">Expected pace</p>
            <p className="mt-1 text-lg font-semibold text-white">{Math.round(result.expectedSecondsPerQuestion || 0)}s</p>
          </div>
          <div className={statCard}>
            <p className="text-xs text-white/55">Next session</p>
            <p className="mt-1 text-lg font-semibold text-white">{result.nextSessionMinutes || 45} min</p>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Analysis</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/85 md:text-base">{feedbackItems.join(' ')}</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Improvement plan</p>
            </div>
            <motion.ul variants={listVariants} className="mt-3 space-y-2.5">
              {planItems.map((item) => (
                <motion.li
                  key={item}
                  variants={listItemVariants}
                  className="flex items-start gap-2 rounded-2xl bg-white/5 px-3 py-2.5 text-sm text-white/85 md:text-base"
                >
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl lg:grid-cols-2"
        >
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Weak topics</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {weakTopics.length > 0 ? (
                weakTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100"
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-sm text-white/60">No major weak topic detected.</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Strong topics</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {strongTopics.length > 0 ? (
                strongTopics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-100"
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-sm text-white/60">No stable strength yet.</p>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl"
        >
          <div className="flex items-center gap-2">
            <TimerReset className="h-4 w-4 text-amber-300" />
            <p className="text-xs uppercase tracking-[0.22em] text-white/55">Breakdown</p>
          </div>
          <div className="mt-4 space-y-2">
            {breakdown.map((item, index) => (
              <div
                key={item.id || `${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{index + 1}. {item.title}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {item.subjectLabel} • {item.completed ? 'Completed' : 'Unfinished'}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end text-xs text-white/60">
                  <span>{Math.round(item.timeSpentSeconds || 0)}s</span>
                  <span>{Math.round(item.expectedSeconds || 0)}s target</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={sectionVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Delay patterns</p>
            </div>
            <div className="mt-3 space-y-2 text-sm text-white/75">
              {result.delayPatterns?.length ? (
                result.delayPatterns.map((item) => <p key={item}>{item}</p>)
              ) : (
                <p>No major delay pattern detected.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-cyan-300" />
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">Strict feedback</p>
            </div>
            <div className="mt-3 space-y-2 text-sm leading-6 text-white/80">
              {feedbackItems.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </motion.section>

        <div className="grid gap-3 md:grid-cols-2">
          <motion.button
            variants={sectionVariants}
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 px-6 py-4 text-sm font-semibold text-white shadow-[0_0_34px_rgba(139,92,246,0.6)]"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </motion.button>

          <motion.button
            variants={sectionVariants}
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-semibold text-white/85 backdrop-blur-xl transition hover:bg-white/10"
          >
            Retry Exam
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default ExamResult

