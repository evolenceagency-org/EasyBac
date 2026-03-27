import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Clock3,
  Flag,
  GraduationCap,
  Pause,
  Play,
  SkipForward
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import { GhostButton, PrimaryButton, SecondaryButton } from '../components/ui/index.js'
import {
  buildExamSimulationPlan,
  clearExamSession,
  getExamSubjectLabel,
  gradeExam,
  loadExamSession,
  mergeExamResultIntoPersonalization,
  saveExamResult,
  saveExamSession
} from '../utils/examEngine.ts'

const PENDING_EXAM_ACTION_KEY = 'assistant-pending-exam-action'

const SUBJECT_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Math', value: 'math' },
  { label: 'Physics', value: 'physics' },
  { label: 'Philosophie', value: 'philosophie' },
  { label: 'SVT', value: 'svt' },
  { label: 'English', value: 'english' }
]

const DURATION_OPTIONS = [30, 60, 90]

const DIFFICULTY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' }
]

const panelMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18, ease: 'easeOut' }
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const formatTime = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const readPendingExamPayload = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PENDING_EXAM_ACTION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const clearPendingExamPayload = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_EXAM_ACTION_KEY)
}

const normalizeQuestions = (questions = [], fallbackSubject = 'math', fallbackDifficulty = 'medium') =>
  (Array.isArray(questions) ? questions : []).map((question, index) => ({
    ...question,
    id: question?.id || `exam-question-${index + 1}`,
    order: Number(question?.order || index + 1) || index + 1,
    subject: question?.subject || fallbackSubject,
    subjectLabel:
      question?.subjectLabel || getExamSubjectLabel(question?.subject || fallbackSubject),
    difficulty: question?.difficulty || fallbackDifficulty,
    completed: Boolean(question?.completed),
    timeSpentSeconds: Number(question?.timeSpentSeconds || 0) || 0
  }))

const normalizePlan = (plan = {}) => {
  const subject = plan?.subject || 'math'
  const difficulty = plan?.difficulty || 'medium'
  const durationMinutes = Number(plan?.durationMinutes || plan?.duration || 60) || 60
  const questions = normalizeQuestions(plan?.questions || [], subject, difficulty)

  return {
    ...plan,
    examId: plan?.examId || `exam-${Date.now()}`,
    subject,
    subjectLabel: plan?.subjectLabel || getExamSubjectLabel(subject),
    difficulty,
    durationMinutes,
    questionCount: questions.length,
    questions
  }
}

const createSession = (planInput, overrides = {}) => {
  const plan = normalizePlan(planInput)
  const maxSeconds = Math.max(0, plan.durationMinutes * 60)
  const remainingSeconds = clamp(
    Number(overrides?.remainingSeconds ?? maxSeconds) || maxSeconds,
    0,
    maxSeconds
  )

  return {
    examId: overrides?.examId || plan.examId,
    plan,
    subject: overrides?.subject || plan.subject,
    subjectLabel: overrides?.subjectLabel || plan.subjectLabel,
    difficulty: overrides?.difficulty || plan.difficulty,
    durationMinutes: Number(overrides?.durationMinutes || plan.durationMinutes || 60) || 60,
    remainingSeconds,
    isRunning: overrides?.isRunning ?? true,
    pausedStartedAt: overrides?.pausedStartedAt || null,
    pausedSeconds: Number(overrides?.pausedSeconds || 0) || 0,
    pauseCount: Number(overrides?.pauseCount || 0) || 0,
    switchCount: Number(overrides?.switchCount || 0) || 0,
    interruptionCount: Number(overrides?.interruptionCount || 0) || 0,
    currentQuestionIndex: clamp(
      Number(overrides?.currentQuestionIndex || 0) || 0,
      0,
      Math.max(0, plan.questions.length - 1)
    ),
    questions: normalizeQuestions(overrides?.questions || plan.questions, plan.subject, plan.difficulty),
    startedAt: overrides?.startedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

const ExamSimulation = () => {
  const {
    user,
    profile,
    loading: authLoading,
    profileLoading,
    updatePersonalization
  } = useAuth()
  const { tasks, loading: dataLoading } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const routeState = location.state || {}
  const pendingExamPayload = useMemo(() => readPendingExamPayload(), [])
  const autoStartPayload = routeState?.autoStart
    ? routeState
    : pendingExamPayload?.autoStart
      ? pendingExamPayload
      : null

  const profileSource = profile?.personalization || profile || {}
  const hydratedRef = useRef(false)
  const finishLockRef = useRef(false)
  const sessionRef = useRef(null)

  const [screen, setScreen] = useState('loading')
  const [selectedSubject, setSelectedSubject] = useState(routeState?.subject || 'auto')
  const [selectedDuration, setSelectedDuration] = useState(
    Number(routeState?.durationMinutes || routeState?.duration || 60) || 60
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState(routeState?.difficulty || 'auto')
  const [session, setSession] = useState(null)
  const [result, setResult] = useState(null)

  const ready = !authLoading && !profileLoading && !dataLoading.tasks

  const previewPlan = useMemo(
    () =>
      normalizePlan(
        buildExamSimulationPlan(profileSource, tasks, {
          subject: selectedSubject,
          durationMinutes: selectedDuration,
          difficulty: selectedDifficulty
        })
      ),
    [profileSource, selectedDifficulty, selectedDuration, selectedSubject, tasks]
  )

  const currentQuestion = useMemo(() => {
    if (!session?.questions?.length) return null
    return session.questions[session.currentQuestionIndex] || session.questions[0] || null
  }, [session])

  const completedQuestions = useMemo(
    () => session?.questions?.filter((question) => question.completed).length || 0,
    [session]
  )

  const persistSession = useCallback(
    (nextSession) => {
      sessionRef.current = nextSession
      setSession(nextSession)
      if (user?.id && nextSession) {
        saveExamSession(user.id, nextSession)
      }
    },
    [user?.id]
  )

  const updateSession = useCallback(
    (updater) => {
      setSession((current) => {
        if (!current) return current
        const next = typeof updater === 'function' ? updater(current) : updater
        if (!next) return current
        const normalized = createSession(next.plan || current.plan, next)
        sessionRef.current = normalized
        if (user?.id) {
          saveExamSession(user.id, normalized)
        }
        return normalized
      })
    },
    [user?.id]
  )

  const buildPlanFromPayload = useCallback(() => {
    if (!autoStartPayload) return null
    if (Array.isArray(autoStartPayload?.questions) && autoStartPayload.questions.length > 0) {
      return normalizePlan(autoStartPayload)
    }

    return normalizePlan(
      buildExamSimulationPlan(profileSource, tasks, {
        subject: autoStartPayload?.subject || 'auto',
        durationMinutes: autoStartPayload?.durationMinutes ?? autoStartPayload?.duration ?? 60,
        difficulty: autoStartPayload?.difficulty || 'auto'
      })
    )
  }, [autoStartPayload, profileSource, tasks])

  const startExam = useCallback(
    (planInput = previewPlan) => {
      const plan = normalizePlan(planInput)
      if (!plan.questions.length) return

      finishLockRef.current = false
      setResult(null)
      persistSession(createSession(plan))
      setScreen('running')
      clearPendingExamPayload()
    },
    [persistSession, previewPlan]
  )

  const finishExam = useCallback(
    async (reason = 'manual') => {
      if (finishLockRef.current) return
      const current = sessionRef.current
      if (!current) return
      finishLockRef.current = true

      const now = Date.now()
      const pausedDelta =
        !current.isRunning && current.pausedStartedAt
          ? Math.max(0, Math.round((now - current.pausedStartedAt) / 1000))
          : 0

      const finalSession = createSession(current.plan, {
        ...current,
        isRunning: false,
        pausedStartedAt: null,
        pausedSeconds: (Number(current.pausedSeconds || 0) || 0) + pausedDelta,
        updatedAt: new Date().toISOString(),
        finishedReason: reason
      })

      const nextResult = gradeExam(finalSession)
      setResult(nextResult)
      setScreen('finished')
      setSession(null)
      sessionRef.current = null

      if (user?.id) {
        clearExamSession(user.id)
        saveExamResult(user.id, nextResult)
      }

      try {
        const nextPersonalization = mergeExamResultIntoPersonalization(
          profile?.personalization || profile || {},
          nextResult
        )
        await updatePersonalization(nextPersonalization)
      } catch {
        // Keep finish flow stable even if personalization sync fails.
      }
    },
    [profile, updatePersonalization, user?.id]
  )

  useEffect(() => {
    hydratedRef.current = false
    finishLockRef.current = false
  }, [user?.id])

  useEffect(() => {
    if (!ready || !user?.id || hydratedRef.current) return
    hydratedRef.current = true

    const saved = loadExamSession(user.id)
    if (saved?.questions?.length || saved?.plan?.questions?.length) {
      const restored = createSession(saved.plan || saved, saved)
      persistSession(restored)
      setScreen('running')
      clearPendingExamPayload()
      return
    }

    const autoPlan = buildPlanFromPayload()
    if (autoPlan?.questions?.length) {
      startExam(autoPlan)
      return
    }

    clearPendingExamPayload()
    setScreen('idle')
  }, [buildPlanFromPayload, persistSession, ready, startExam, user?.id])

  useEffect(() => {
    if (screen !== 'running' || !session?.isRunning) return undefined

    const timerId = window.setInterval(() => {
      updateSession((current) => {
        if (!current?.isRunning) return current

        const currentIndex = clamp(
          Number(current.currentQuestionIndex || 0) || 0,
          0,
          Math.max(0, current.questions.length - 1)
        )

        const questions = current.questions.map((question, index) =>
          index === currentIndex
            ? {
                ...question,
                timeSpentSeconds: (Number(question.timeSpentSeconds || 0) || 0) + 1
              }
            : question
        )

        return {
          ...current,
          questions,
          remainingSeconds: Math.max(0, Number(current.remainingSeconds || 0) - 1),
          updatedAt: new Date().toISOString()
        }
      })
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [screen, session?.isRunning, updateSession])

  useEffect(() => {
    if (screen !== 'running' || !session) return
    if (session.remainingSeconds > 0) return
    finishExam('time')
  }, [finishExam, screen, session])

  const handlePauseToggle = () => {
    updateSession((current) => {
      if (!current) return current
      const now = Date.now()

      if (current.isRunning) {
        return {
          ...current,
          isRunning: false,
          pauseCount: (Number(current.pauseCount || 0) || 0) + 1,
          pausedStartedAt: now,
          updatedAt: new Date().toISOString()
        }
      }

      const pausedDelta = current.pausedStartedAt
        ? Math.max(0, Math.round((now - current.pausedStartedAt) / 1000))
        : 0

      return {
        ...current,
        isRunning: true,
        pausedStartedAt: null,
        pausedSeconds: (Number(current.pausedSeconds || 0) || 0) + pausedDelta,
        updatedAt: new Date().toISOString()
      }
    })
  }

  const handleSkipQuestion = () => {
    updateSession((current) => {
      if (!current) return current
      const lastIndex = Math.max(0, current.questions.length - 1)
      const nextIndex = clamp((Number(current.currentQuestionIndex || 0) || 0) + 1, 0, lastIndex)
      if (nextIndex === current.currentQuestionIndex) return current

      return {
        ...current,
        currentQuestionIndex: nextIndex,
        switchCount: (Number(current.switchCount || 0) || 0) + 1,
        updatedAt: new Date().toISOString()
      }
    })
  }

  const handleCompleteQuestion = () => {
    updateSession((current) => {
      if (!current) return current
      const currentIndex = clamp(
        Number(current.currentQuestionIndex || 0) || 0,
        0,
        Math.max(0, current.questions.length - 1)
      )
      const questions = current.questions.map((question, index) =>
        index === currentIndex ? { ...question, completed: !question.completed } : question
      )
      const movedIndex =
        questions[currentIndex]?.completed && currentIndex < questions.length - 1
          ? currentIndex + 1
          : currentIndex

      return {
        ...current,
        questions,
        currentQuestionIndex: movedIndex,
        switchCount:
          movedIndex !== currentIndex
            ? (Number(current.switchCount || 0) || 0) + 1
            : Number(current.switchCount || 0) || 0,
        updatedAt: new Date().toISOString()
      }
    })
  }

  const handleStartNew = () => {
    finishLockRef.current = false
    setResult(null)
    setSession(null)
    sessionRef.current = null
    if (user?.id) {
      clearExamSession(user.id)
    }
    setScreen('idle')
  }

  const handleViewResult = () => {
    if (!result) return
    navigate('/exam-result', { state: { result } })
  }

  const renderSetup = () => (
    <motion.section {...panelMotion} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="exam-subject" className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/55">
            Subject
          </label>
          <select
            id="exam-subject"
            value={selectedSubject}
            onChange={(event) => setSelectedSubject(event.target.value)}
            className="surface-input h-11 w-full appearance-none px-3 text-sm text-white outline-none"
          >
            {SUBJECT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#0b0b0f] text-white">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/55">
            Duration
          </span>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((minutes) => {
              const isActive = selectedDuration === minutes
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSelectedDuration(minutes)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-200 ease-out ${
                    isActive
                      ? 'border-[rgba(139,92,246,0.55)] bg-[rgba(139,92,246,0.12)] text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/72 hover:border-[rgba(139,92,246,0.32)] hover:text-white'
                  }`}
                >
                  {minutes} min
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/55">
            Difficulty
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {DIFFICULTY_OPTIONS.map((option) => {
              const isActive = selectedDifficulty === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedDifficulty(option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition duration-200 ease-out ${
                    isActive
                      ? 'border-[rgba(139,92,246,0.55)] bg-[rgba(139,92,246,0.12)] text-white'
                      : 'border-white/[0.08] bg-white/[0.02] text-white/72 hover:border-[rgba(139,92,246,0.32)] hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-white/[0.06] bg-black/20 p-4">
        <p className="text-sm font-medium text-white">{previewPlan.subjectLabel} simulation</p>
        <p className="mt-1 text-sm text-white/60">{previewPlan.questionCount} questions • {previewPlan.durationMinutes} minutes • {previewPlan.difficulty}</p>
      </div>

      <PrimaryButton className="mt-5 h-11 w-full" onClick={() => startExam(previewPlan)}>
        Start exam
      </PrimaryButton>
    </motion.section>
  )

  const renderSession = () => (
    <motion.section {...panelMotion} className="space-y-4">
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0f] p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.18em] text-white/50">Time remaining</p>
        <div className="mt-3 text-5xl font-semibold tracking-tight text-white sm:text-6xl">{formatTime(session?.remainingSeconds || 0)}</div>
        <p className="mt-3 text-sm text-white/60">{session?.subjectLabel} • {session?.difficulty}</p>
        <div className="mx-auto mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#8b5cf6] transition-all duration-300 ease-out"
            style={{
              width: `${Math.max(
                6,
                ((Number(session?.durationMinutes || 0) * 60 - Number(session?.remainingSeconds || 0)) /
                  Math.max(1, Number(session?.durationMinutes || 0) * 60)) *
                  100
              )}%`
            }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/50">
              Question {Math.min((session?.currentQuestionIndex || 0) + 1, session?.questions?.length || 1)} of {session?.questions?.length || 1}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">{currentQuestion?.title}</h2>
          </div>
          {currentQuestion?.completed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Done
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm leading-7 text-white/72">{currentQuestion?.prompt}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <GhostButton className="h-10 px-3 text-sm" onClick={handleSkipQuestion}>
            <SkipForward className="mr-1.5 h-4 w-4" />
            Skip
          </GhostButton>
          <SecondaryButton className="h-10 px-3 text-sm" onClick={handleCompleteQuestion}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {currentQuestion?.completed ? 'Undo' : 'Mark done'}
          </SecondaryButton>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SecondaryButton className="h-11 flex-1" onClick={handlePauseToggle}>
          {session?.isRunning ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </>
          )}
        </SecondaryButton>
        <PrimaryButton className="h-11 flex-1" onClick={() => finishExam('manual')}>
          <Flag className="mr-2 h-4 w-4" />
          Finish
        </PrimaryButton>
      </div>
    </motion.section>
  )

  const renderFinished = () => (
    <motion.section {...panelMotion} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[20px] md:p-6">
      <p className="text-xs uppercase tracking-[0.16em] text-white/50">Simulation complete</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-semibold tracking-tight text-white">{result?.overallScore || 0}</p>
          <p className="mt-1 text-sm text-white/60">Overall score</p>
        </div>
        <div className="text-right text-sm text-white/60">
          <p>{result?.subjectLabel}</p>
          <p>{result?.durationMinutes} min</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-white/45">Completed</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {Math.round((result?.completionRate || 0) * 100)}%
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-white/45">Next session</p>
          <p className="mt-2 text-lg font-semibold text-white">{result?.nextSessionMinutes || 45} min</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-white/68">
        {Array.isArray(result?.feedback) && result.feedback.length > 0
          ? result.feedback[0]
          : 'Your result is ready.'}
      </p>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <PrimaryButton className="h-11 flex-1" onClick={handleViewResult}>
          View result
        </PrimaryButton>
        <SecondaryButton className="h-11 flex-1" onClick={handleStartNew}>
          New simulation
        </SecondaryButton>
      </div>
    </motion.section>
  )

  return (
    <div className="min-h-screen bg-[#050507] px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6">
        <motion.header {...panelMotion} className="text-center sm:text-left">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(139,92,246,0.22)] bg-[rgba(139,92,246,0.08)] text-[#c4b5fd] sm:mx-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
            Exam Simulation
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Practice in real exam conditions
          </p>
        </motion.header>

        {!ready ? (
          <motion.div {...panelMotion} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-sm text-white/60 backdrop-blur-[20px]">
            Loading your exam setup...
          </motion.div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {screen === 'running' && session ? (
              <motion.div key="running">{renderSession()}</motion.div>
            ) : null}
            {screen === 'finished' && result ? (
              <motion.div key="finished">{renderFinished()}</motion.div>
            ) : null}
            {screen === 'idle' || screen === 'loading' ? (
              <motion.div key="idle">{renderSetup()}</motion.div>
            ) : null}
          </AnimatePresence>
        )}

        {screen === 'running' && session ? (
          <div className="text-center text-xs text-white/42">
            <Clock3 className="mr-1 inline h-3.5 w-3.5" />
            {completedQuestions} of {session.questions.length} questions marked done
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ExamSimulation

