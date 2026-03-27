import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Brain, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { isPersonalized } from '../utils/personalization.js'
import { toCanonicalProfile } from '../utils/aiProfiling.js'
import { generateDailyInsight } from '../utils/aiEngine.ts'
import { buildMemoryGraphSnapshot, mergeMemoryGraphIntoPersonalization } from '../utils/memoryGraph.ts'

const QUESTION_LEVEL = {
  id: 'level',
  type: 'single',
  title: 'What is your current level?',
  options: ['Good', 'Average', 'Struggling']
}

const QUESTION_GOAL = {
  id: 'goal',
  type: 'single',
  title: 'What is your main goal?',
  options: ['Just pass', 'Good grade', 'Top score']
}

const BRANCH_QUESTIONS = {
  Struggling: [
    {
      id: 'weakSubjects',
      type: 'multi',
      title: 'Which subjects are hardest right now?',
      options: ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
    },
    {
      id: 'focusIssue',
      type: 'single',
      title: 'What is your main issue?',
      options: ["Don't understand lessons", 'Lack of focus', 'No practice']
    }
  ],
  Average: [
    {
      id: 'weakSubjects',
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
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.97, y: 16, transition: { duration: 0.18, ease: 'easeOut' } }
}

const optionContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 }
  }
}

const optionItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }
}

const toGoalValue = (value) => {
  if (value === 'Pass') return 'Just pass'
  return value || 'Good grade'
}

const fromProfileToAnswers = (personalization) => {
  const normalized = toCanonicalProfile(personalization || {})
  const answers = {
    level: normalized.level || '',
    goal: toGoalValue(normalized.goal)
  }

  if (normalized.level === 'Struggling') {
    answers.weakSubjects = normalized.weakSubjects
    answers.focusIssue = normalized.focusIssues[0] || "Don't understand lessons"
    return answers
  }

  if (normalized.level === 'Average') {
    answers.weakSubjects = normalized.weakSubjects
    answers.studyHours = normalized.studyHours || '2-4h'
    return answers
  }

  if (normalized.level === 'Good') {
    answers.targetScore = normalized.targetScore || '16-17'
    answers.weakestSubject =
      normalized.weakestSubject || normalized.weakSubjects[0] || 'Math'
    answers.consistency = normalized.consistency || '4-5 days/week'
    return answers
  }

  return answers
}

const buildPersonalizationPayload = (answers, previousPersonalization) => {
  const previous = toCanonicalProfile(previousPersonalization || {})
  const level = answers.level || previous.level || 'Average'
  const weakSubjects = Array.isArray(answers.weakSubjects)
    ? answers.weakSubjects
    : answers.weakestSubject
      ? [answers.weakestSubject]
      : previous.weakSubjects

  let studyHours = answers.studyHours || previous.studyHours || '2-4h'
  let focusIssues = previous.focusIssues || []
  let consistency = previous.consistency || ''

  if (level === 'Struggling') {
    focusIssues = [answers.focusIssue || "Don't understand lessons"]
    studyHours = 'Less than 2h'
  }

  if (level === 'Average') {
    focusIssues = previous.focusIssues.length > 0 ? previous.focusIssues : ['Inconsistent']
    studyHours = answers.studyHours || '2-4h'
  }

  if (level === 'Good') {
    consistency = answers.consistency || '4-5 days/week'
    studyHours =
      consistency === 'Every day'
        ? '4h+'
        : consistency === '4-5 days/week'
          ? '2-4h'
          : 'Less than 2h'
    focusIssues =
      consistency === '1-3 days/week' ? ['Inconsistent'] : previous.focusIssues
  }

  const goal = answers.goal || previous.goal || 'Good grade'
  const normalizedGoal = goal === 'Just pass' ? 'Pass' : goal

  return {
    level,
    weakSubjects,
    studyHours,
    goal: normalizedGoal,
    focusIssues,
    consistency,
    targetScore: answers.targetScore || previous.targetScore || '',
    weakestSubject:
      answers.weakestSubject || previous.weakestSubject || weakSubjects[0] || '',
    onboardingPath: level.toLowerCase(),
    isPersonalized: true,
    // Legacy compatibility fields used in older UI parts.
    dailyStudyTime: studyHours,
    mainGoal: normalizedGoal,
    biggestProblem: focusIssues[0] || ''
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
  const { tasks, studySessions } = useData()
  const [answers, setAnswers] = useState({})
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isExiting, setIsExiting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const onboardingLocked = useMemo(() => !isPersonalized(profile), [profile])
  const personalization = useMemo(
    () => toCanonicalProfile(profile?.personalization || {}),
    [profile?.personalization]
  )

  const editsRemaining =
    Number.isFinite(personalization.profileEditsRemaining) &&
    personalization.profileEditsRemaining >= 0
      ? personalization.profileEditsRemaining
      : 1

  const shouldShowQuestionnaire = onboardingLocked || isEditing

  useEffect(() => {
    setAnswers(fromProfileToAnswers(profile?.personalization || {}))
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
    setTimeout(() => navigate(path, options), 260)
  }

  const persistProfile = async ({ consumeEdit = false }) => {
    const payload = buildPersonalizationPayload(answers, profile?.personalization)
    const nextEdits = consumeEdit ? Math.max(0, editsRemaining - 1) : editsRemaining
    const mergedPayload = {
      ...(profile?.personalization || {}),
      ...payload,
      profileEditsRemaining: nextEdits
    }
    const memoryGraph = buildMemoryGraphSnapshot({
      personalization: mergedPayload,
      tasks
    })
    const aiSnapshot = generateDailyInsight(
      { personalization: mergedPayload, memoryGraph },
      { tasks, studySessions }
    )
    await updatePersonalization({
      ...mergeMemoryGraphIntoPersonalization(mergedPayload, memoryGraph),
      ai: aiSnapshot
    })
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
      await persistProfile({ consumeEdit: !onboardingLocked && isEditing })
      setIsEditing(false)
      withExitAndNavigate(onboardingLocked ? '/choose-plan' : '/ai-result')
    } catch {
      setError('Unable to save your profile right now. Please try again.')
      setSaving(false)
    }
  }

  const openEdit = () => {
    if (editsRemaining <= 0) return
    setIsEditing(true)
    setStepIndex(0)
    setError('')
  }

  const aiSnapshot = personalization.ai || null
  const weakSubjectsLabel =
    personalization.weakSubjects.length > 0
      ? personalization.weakSubjects.join(', ')
      : 'Not set'
  const focusIssuesLabel =
    personalization.focusIssues.length > 0
      ? personalization.focusIssues.join(', ')
      : 'Not set'

  if (!shouldShowQuestionnaire) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <motion.section
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_35px_rgba(139,92,246,0.16)] backdrop-blur-xl md:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                Personalization
              </p>
              <h1 className="mt-2 text-xl font-semibold text-white md:text-2xl">
                Profile overview
              </h1>
              <p className="mt-2 text-sm text-white/70">
                Your profile drives AI scoring and daily improvement logic.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              Edits left: {editsRemaining}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Profile</p>
              <ul className="mt-3 space-y-2 text-sm text-white/85">
                <li>Level: {personalization.level}</li>
                <li>Study hours: {personalization.studyHours}</li>
                <li>Goal: {personalization.goal}</li>
                <li>Weak subjects: {weakSubjectsLabel}</li>
                <li>Focus issues: {focusIssuesLabel}</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">AI Status</p>
              <p className="mt-3 text-4xl font-semibold text-cyan-300">
                {aiSnapshot?.score ?? '--'}
                <span className="ml-1 text-base text-white/70">/100</span>
              </p>
              <p className="mt-2 text-xs text-white/65">
                Last updated: {aiSnapshot?.lastUpdated || 'Not generated yet'}
              </p>
              <p className="mt-3 text-sm text-white/75">
                {aiSnapshot?.analysis || 'Complete a profile update to generate AI analysis.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              whileHover={editsRemaining > 0 ? { y: -1 } : undefined}
              disabled={editsRemaining <= 0}
              onClick={openEdit}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Edit profile {editsRemaining > 0 ? '' : '(locked)'}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate('/ai-result')}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)] transition hover:scale-[1.01]"
            >
              View AI result
            </motion.button>
          </div>
        </motion.section>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <motion.section
        variants={pageVariants}
        initial="hidden"
        animate={isExiting ? 'exit' : 'visible'}
        className="relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_0_35px_rgba(139,92,246,0.18)] backdrop-blur-xl md:p-6"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10">
            <Brain className="h-4 w-4 text-cyan-200" />
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/60">
            {onboardingLocked ? 'Personalization' : 'Profile edit'}
          </p>
        </div>
        <h1 className="mt-3 text-xl font-semibold text-white md:text-2xl">
          {onboardingLocked ? 'Build your study profile' : 'Edit your profile'}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {onboardingLocked
            ? 'Answer a few targeted questions to power your AI scoring engine.'
            : `One edit updates your score model instantly. Edits left: ${editsRemaining}.`}
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
              transition={{ duration: 0.18, ease: 'easeOut' }}
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
              transition={{ duration: 0.18, ease: 'easeOut' }}
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
          {!onboardingLocked && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              disabled={saving}
              onClick={() => setIsEditing(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </motion.button>
          )}
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
                ? onboardingLocked
                  ? 'Generate AI result'
                  : 'Save edit'
                : 'Continue'}
          </motion.button>
        </div>

        {!onboardingLocked && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            You can edit your profile once. Score recalculates from profile + real activity.
          </div>
        )}
      </motion.section>
    </div>
  )
}

export default Personalization

