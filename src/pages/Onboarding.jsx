import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, CheckCircle2, ChevronRight, Goal, Layers3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import GuidedFlowShell from '../components/flow/GuidedFlowShell.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { hasSelectedPlan, isEmailVerified } from '../utils/authFlow.js'
import { isPersonalized } from '../utils/personalization.js'

const SUBJECT_OPTIONS = ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
const GOAL_OPTIONS = ['Pass with confidence', 'Reach a strong grade', 'Aim for the top']

const buildOnboardingPayload = (profile, answers) => ({
  ...(profile?.personalization || {}),
  subjects: answers.subjects,
  weakSubjects: answers.subjects,
  goal: answers.goal,
  mainGoal: answers.goal,
  examDate: answers.examDate,
  level: profile?.personalization?.level || 'Average',
  studyHours: profile?.personalization?.studyHours || '2-4h',
  focusIssues: profile?.personalization?.focusIssues?.length
    ? profile.personalization.focusIssues
    : ['Inconsistent'],
  dailyStudyTime: profile?.personalization?.dailyStudyTime || '2-4h',
  biggestProblem: profile?.personalization?.biggestProblem || 'Consistency',
  isPersonalized: true
})

const steps = [
  {
    id: 'subjects',
    icon: Layers3,
    title: 'Which subjects matter most right now?',
    description: 'Pick the subjects you want EasyBac to prioritize first.'
  },
  {
    id: 'goal',
    icon: Goal,
    title: 'What are you aiming for?',
    description: 'Choose one goal so we can shape the right pace and guidance.'
  },
  {
    id: 'examDate',
    icon: CalendarDays,
    title: 'When is your exam?',
    description: 'We use your date to pace reminders, sessions, and urgency.'
  }
]

const panelMotion = {
  initial: (direction) => ({ opacity: 0, x: direction > 0 ? 28 : -28 }),
  animate: { opacity: 1, x: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -18 : 18, transition: { duration: 0.18, ease: 'easeOut' } })
}

const Onboarding = () => {
  const navigate = useNavigate()
  const { user, profile, initialized, loading, profileLoading, updatePersonalization } = useAuth()
  const [answers, setAnswers] = useState({ subjects: [], goal: '', examDate: '' })
  const [stepIndex, setStepIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const personalization = profile?.personalization || {}
    setAnswers({
      subjects: personalization.subjects || personalization.weakSubjects || [],
      goal: personalization.goal || personalization.mainGoal || '',
      examDate: personalization.examDate || ''
    })
  }, [profile?.personalization])

  useEffect(() => {
    if (!initialized || loading || profileLoading) return

    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (!isEmailVerified(user)) {
      navigate('/verify', { replace: true, state: { email: user.email } })
      return
    }

    if (isPersonalized(profile)) {
      if (!hasSelectedPlan(profile)) {
        navigate('/choose-plan', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    }
  }, [initialized, loading, navigate, profile, profileLoading, user])

  const currentStep = steps[stepIndex]
  const StepIcon = currentStep.icon
  const canContinue = useMemo(() => {
    if (currentStep.id === 'subjects') return answers.subjects.length > 0
    if (currentStep.id === 'goal') return Boolean(answers.goal)
    if (currentStep.id === 'examDate') return Boolean(answers.examDate)
    return false
  }, [answers.examDate, answers.goal, answers.subjects.length, currentStep.id])

  const handleSubjectToggle = (subject) => {
    setError('')
    setAnswers((prev) => {
      const exists = prev.subjects.includes(subject)
      return {
        ...prev,
        subjects: exists
          ? prev.subjects.filter((item) => item !== subject)
          : [...prev.subjects, subject]
      }
    })
  }

  const handleNext = async () => {
    setError('')
    if (!canContinue) {
      setError('Choose an answer to keep going.')
      return
    }

    if (stepIndex < steps.length - 1) {
      setDirection(1)
      setStepIndex((prev) => prev + 1)
      return
    }

    try {
      setSaving(true)
      await updatePersonalization(buildOnboardingPayload(profile, answers))
      navigate('/choose-plan', { replace: true })
    } catch {
      setError('We could not save your setup just now. Try again once more.')
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (stepIndex === 0) {
      navigate('/login', { replace: true })
      return
    }

    setError('')
    setDirection(-1)
    setStepIndex((prev) => prev - 1)
  }

  return (
    <GuidedFlowShell
      step={1}
      eyebrow="Onboarding"
      title="Let’s set up your study plan"
      description="Three quick answers, then we’ll take you straight to plan selection."
      onBack={handleBack}
    >
      <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep.id}
            custom={direction}
            variants={panelMotion}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#c084fc]">
                <StepIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{currentStep.title}</p>
                <p className="mt-1 text-sm text-white/65">{currentStep.description}</p>
              </div>
            </div>

            {currentStep.id === 'subjects' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {SUBJECT_OPTIONS.map((subject) => {
                  const selected = answers.subjects.includes(subject)
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => handleSubjectToggle(subject)}
                      className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${
                        selected
                          ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/12 text-white'
                          : 'border-white/[0.08] bg-white/[0.02] text-white/78 hover:border-white/[0.14] hover:bg-white/[0.04]'
                      }`}
                    >
                      {subject}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {currentStep.id === 'goal' ? (
              <div className="space-y-3">
                {GOAL_OPTIONS.map((goal) => {
                  const selected = answers.goal === goal
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => {
                        setError('')
                        setAnswers((prev) => ({ ...prev, goal }))
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${
                        selected
                          ? 'border-[#8b5cf6]/60 bg-[#8b5cf6]/12 text-white'
                          : 'border-white/[0.08] bg-white/[0.02] text-white/78 hover:border-white/[0.14] hover:bg-white/[0.04]'
                      }`}
                    >
                      <span>{goal}</span>
                      {selected ? <CheckCircle2 className="h-4 w-4 text-[#c084fc]" /> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {currentStep.id === 'examDate' ? (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <label htmlFor="exam-date" className="block text-xs uppercase tracking-[0.2em] text-white/45">
                  Exam date
                </label>
                <input
                  id="exam-date"
                  type="date"
                  value={answers.examDate}
                  onChange={(event) => {
                    setError('')
                    setAnswers((prev) => ({ ...prev, examDate: event.target.value }))
                  }}
                  className="mt-3 w-full rounded-2xl border border-white/[0.08] bg-[#0b0b0f] px-4 py-3 text-sm text-white outline-none transition focus:border-[#8b5cf6]/55 focus:ring-2 focus:ring-[#8b5cf6]/15"
                />
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Step {stepIndex + 1} of {steps.length}
          </p>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#8b5cf6] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7c3aed] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : stepIndex === steps.length - 1 ? 'Continue to plans' : 'Next'}
            {!saving ? <ChevronRight className="h-4 w-4" /> : null}
          </button>
        </div>
      </section>
    </GuidedFlowShell>
  )
}

export default Onboarding

