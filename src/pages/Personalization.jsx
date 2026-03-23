import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isPersonalized } from '../utils/personalization.js'
import { generateInitialAIPlan } from '../utils/initialAIPlan.js'

const QUESTION_LEVEL = {
  id: 'level',
  type: 'single',
  title: 'What is your current level?',
  options: ['Good', 'Average', 'Struggling']
}

const QUESTION_GOAL = {
  id: 'mainGoal',
  type: 'single',
  title: 'What is your main goal?',
  options: ['Just pass', 'Good grade', 'Top score']
}

const BRANCH_QUESTIONS = {
  Struggling: [
    {
      id: 'hardSubjects',
      type: 'multi',
      title: 'Which subjects are hardest right now?',
      options: ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
    },
    {
      id: 'mainIssue',
      type: 'single',
      title: 'What is your main issue?',
      options: ["Don't understand lessons", 'No focus', 'No practice']
    }
  ],
  Average: [
    {
      id: 'improveSubjects',
      type: 'multi',
      title: 'Which subjects need improvement?',
      options: ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
    },
    {
      id: 'studyHours',
      type: 'single',
      title: 'How many hours do you study daily?',
      options: ['Less than 2h', '2-4h', '4h+']
    }
  ],
  Good: [
    {
      id: 'targetScore',
      type: 'single',
      title: 'What is your target score?',
      options: ['14-15', '16-17', '18+']
    },
    {
      id: 'weakestSubject',
      type: 'single',
      title: 'Which subject is currently the weakest?',
      options: ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
    },
    {
      id: 'consistency',
      type: 'single',
      title: 'How consistent is your daily study?',
      options: ['Every day', '4-5 days/week', '1-3 days/week']
    }
  ]
}

const pageVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.97, y: 18, transition: { duration: 0.28, ease: 'easeOut' } }
}

const optionContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
}

const optionItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } }
}

const fromProfileToAnswers = (personalization) => {
  if (!personalization || typeof personalization !== 'object') {
    return {}
  }

  const level = personalization.level || ''
  const base = {
    level,
    mainGoal: personalization.mainGoal || ''
  }

  if (level === 'Struggling') {
    return {
      ...base,
      hardSubjects: Array.isArray(personalization.weakSubjects)
        ? personalization.weakSubjects
        : [],
      mainIssue: personalization.biggestProblem || ''
    }
  }

  if (level === 'Average') {
    return {
      ...base,
      improveSubjects: Array.isArray(personalization.weakSubjects)
        ? personalization.weakSubjects
        : [],
      studyHours: personalization.dailyStudyTime || ''
    }
  }

  if (level === 'Good') {
    return {
      ...base,
      targetScore: personalization.targetScore || '',
      weakestSubject:
        personalization.weakestSubject ||
        (Array.isArray(personalization.weakSubjects)
          ? personalization.weakSubjects[0] || ''
          : ''),
      consistency: personalization.consistency || ''
    }
  }

  return base
}

const buildPersonalizationPayload = (answers) => {
  const level = answers.level || ''
  const mainGoal =
    answers.mainGoal === 'Just pass'
      ? 'Pass'
      : answers.mainGoal === 'Good grade'
        ? 'Good grade'
        : answers.mainGoal || 'Pass'

  if (level === 'Struggling') {
    return {
      level,
      weakSubjects: answers.hardSubjects || [],
      dailyStudyTime: 'Less than 2h',
      mainGoal,
      biggestProblem: answers.mainIssue || "Don't understand lessons",
      onboardingPath: 'struggling',
      isPersonalized: true
    }
  }

  if (level === 'Average') {
    return {
      level,
      weakSubjects: answers.improveSubjects || [],
      dailyStudyTime: answers.studyHours || '2-4h',
      mainGoal,
      biggestProblem: 'Inconsistent',
      onboardingPath: 'average',
      isPersonalized: true
    }
  }

  const consistency = answers.consistency || '4-5 days/week'
  const derivedDailyStudyTime =
    consistency === 'Every day'
      ? '4h+'
      : consistency === '4-5 days/week'
        ? '2-4h'
        : 'Less than 2h'

  return {
    level: level || 'Good',
    weakSubjects: answers.weakestSubject ? [answers.weakestSubject] : [],
    dailyStudyTime: derivedDailyStudyTime,
    mainGoal,
    biggestProblem:
      consistency === '1-3 days/week' ? 'Inconsistent' : 'Need optimization',
    targetScore: answers.targetScore || '16-17',
    weakestSubject: answers.weakestSubject || '',
    consistency,
    onboardingPath: 'good',
    isPersonalized: true
  }
}

const isAnswered = (question, answers) => {
  if (!question) return false
  const value = answers[question.id]
  if (question.type === 'multi') {
    return Array.isArray(value) && value.length > 0
  }
  return typeof value === 'string' && value.trim().length > 0
}

const Personalization = () => {
  const navigate = useNavigate()
  const { profile, updatePersonalization } = useAuth()
  const [answers, setAnswers] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isExiting, setIsExiting] = useState(false)

  const onboardingLocked = useMemo(() => !isPersonalized(profile), [profile])

  useEffect(() => {
    const savedAnswers = fromProfileToAnswers(profile?.personalization)
    setAnswers(savedAnswers)
  }, [profile?.personalization])

  const questionFlow = useMemo(() => {
    const level = answers.level
    const branch = level ? BRANCH_QUESTIONS[level] || [] : []
    return [QUESTION_LEVEL, ...branch, QUESTION_GOAL]
  }, [answers.level])

  useEffect(() => {
    if (stepIndex > questionFlow.length - 1) {
      setStepIndex(Math.max(0, questionFlow.length - 1))
    }
  }, [questionFlow.length, stepIndex])

  const currentQuestion = questionFlow[stepIndex]
  const progressPercent = Math.round(((stepIndex + 1) / questionFlow.length) * 100)

  const withExitAndNavigate = (path, options = {}) => {
    setIsExiting(true)
    setTimeout(() => navigate(path, options), 280)
  }

  const setSingleAnswer = (questionId, value) => {
    setError('')
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const toggleMultiAnswer = (questionId, value) => {
    setError('')
    setAnswers((prev) => {
      const previous = Array.isArray(prev[questionId]) ? prev[questionId] : []
      const exists = previous.includes(value)
      return {
        ...prev,
        [questionId]: exists
          ? previous.filter((item) => item !== value)
          : [...previous, value]
      }
    })
  }

  const handleSkip = async () => {
    setError('')
    try {
      setSaving(true)
      await updatePersonalization({
        ...(profile?.personalization || {}),
        isPersonalized: true
      })
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('onboarding-complete-toast', '1')
      }
      withExitAndNavigate('/dashboard', { state: { fromOnboarding: true } })
    } catch {
      setError('Unable to skip right now. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleContinue = async () => {
    if (!isAnswered(currentQuestion, answers)) {
      setError('Please choose an option to continue.')
      return
    }

    setError('')
    const isLastStep = stepIndex >= questionFlow.length - 1
    if (!isLastStep) {
      setStepIndex((prev) => prev + 1)
      return
    }

    try {
      setSaving(true)
      const payload = buildPersonalizationPayload(answers)
      const aiPlan = generateInitialAIPlan({
        ...answers,
        level: payload.level,
        dailyStudyTime: payload.dailyStudyTime,
        weakSubjects: payload.weakSubjects,
        mainGoal: answers.mainGoal
      })

      await updatePersonalization({
        ...payload,
        ai: aiPlan
      })
      withExitAndNavigate('/welcome-ai')
    } catch {
      setError('Unable to save your onboarding right now. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate={isExiting ? 'exit' : 'visible'}
        className="relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_35px_rgba(139,92,246,0.18)] backdrop-blur-xl md:p-6"
      >
        {onboardingLocked && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={handleSkip}
            disabled={saving}
            className="absolute right-4 top-4 text-xs text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Skip
          </motion.button>
        )}

        <p className="text-xs uppercase tracking-[0.24em] text-white/60">Personalization</p>
        <h1 className="mt-2 text-xl font-semibold text-white md:text-2xl">
          Smart onboarding
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {onboardingLocked
            ? 'Answer a few smart questions to personalize your study system.'
            : 'Update your onboarding profile anytime.'}
        </p>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs text-white/65">
            <span>
              Step {stepIndex + 1} / {questionFlow.length}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="mt-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <h2 className="text-base font-medium text-white md:text-lg">
                {currentQuestion.title}
              </h2>

              <motion.div
                variants={optionContainer}
                initial="hidden"
                animate="visible"
                className="mt-4 flex flex-col gap-2"
              >
                {currentQuestion.options.map((option) => {
                  const selected =
                    currentQuestion.type === 'multi'
                      ? Array.isArray(answers[currentQuestion.id]) &&
                        answers[currentQuestion.id].includes(option)
                      : answers[currentQuestion.id] === option

                  return (
                    <motion.button
                      key={option}
                      type="button"
                      variants={optionItem}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        if (currentQuestion.type === 'multi') {
                          toggleMultiAnswer(currentQuestion.id, option)
                        } else {
                          setSingleAnswer(currentQuestion.id, option)
                        }
                      }}
                      className={`rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                        selected
                          ? 'border-purple-300/60 bg-gradient-to-r from-purple-500/25 to-blue-500/20 text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]'
                          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {option}
                    </motion.button>
                  )
                })}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={saving || stepIndex === 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={saving}
            onClick={handleContinue}
            className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving
              ? 'Saving...'
              : stepIndex >= questionFlow.length - 1
                ? 'Finish'
                : 'Continue'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default Personalization
