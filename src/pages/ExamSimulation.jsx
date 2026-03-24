import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Pause,
  Play,
  Sparkles,
  Target,
  TimerReset
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useData } from '../context/DataContext.jsx'
import {
  buildExamSimulationPlan,
  clearExamSession,
  gradeExam,
  loadExamSession,
  saveExamResult,
  saveExamSession,
  getExamSubjectLabel
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

const DURATION_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '60 min', value: 60 },
  { label: '90 min', value: 90 },
  { label: '120 min', value: 120 }
]

const DIFFICULTY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: 'Easy', value: 'easy' },
  { label: 'Medium', value: 'medium' },
  { label: 'Hard', value: 'hard' }
]

const sectionMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 }
}

const formatTime = (seconds = 0) => {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

const normalizeSession = (plan) => {
  const now = new Date().toISOString()
  return {
    examId: plan.examId,
    plan,
    subject: plan.subject,
    subjectLabel: plan.subjectLabel,
    difficulty: plan.difficulty,
    durationMinutes: plan.durationMinutes,
    questionCount: plan.questionCount,
    startedAt: now,
    updatedAt: now,
    remainingSeconds: plan.durationMinutes * 60,
    isRunning: true,
    currentQuestionIndex: 0,
    questions: plan.questions.map((question, index) => ({
      ...question,
      order: question.order || index + 1,
      completed: Boolean(question.completed),
      timeSpentSeconds: Number(question.timeSpentSeconds || 0) || 0,
      notes: question.notes || '',
      confidence: Number(question.confidence || 3) || 3
    })),
    pauseCount: 0,
    switchCount: 0,
    interruptionCount: 0,
    pausedSeconds: 0,
    totalFocusTimeSeconds: 0,
    lastTickAt: Date.now()
  }
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
const ExamSimulation = () => {
  const { user, profile, loading: authLoading, profileLoading } = useAuth()
  const { tasks, studySessions, loading: dataLoading } = useData()
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
  const [selectedSubject, setSelectedSubject] = useState(routeState?.subject || 'auto')
  const [selectedDuration, setSelectedDuration] = useState(
    routeState?.durationMinutes || routeState?.duration || 'auto'
  )
  const [selectedDifficulty, setSelectedDifficulty] = useState(routeState?.difficulty || 'auto')
  const [session, setSession] = useState(null)
  const [screen, setScreen] = useState('boot')
  const [message, setMessage] = useState('Preparing exam simulation')
  const [note, setNote] = useState('')
  const [savingResult, setSavingResult] = useState(false)

  const sessionRef = useRef(null)
  const finishLockRef = useRef(false)
  const interruptionLockRef = useRef(false)
  const warningLockRef = useRef(false)

  const previewPlan = useMemo(
    () =>
      buildExamSimulationPlan(profileSource, tasks, {
        subject: selectedSubject,
        durationMinutes: selectedDuration === 'auto' ? null : Number(selectedDuration),
        difficulty: selectedDifficulty
      }),
    [profileSource, tasks, selectedDifficulty, selectedDuration, selectedSubject]
  )

  const activePlan = useMemo(() => {
    if (session?.plan) return session.plan
    if (autoStartPayload?.questions?.length) return autoStartPayload
    if (autoStartPayload?.subject || autoStartPayload?.durationMinutes || autoStartPayload?.difficulty) {
      return buildExamSimulationPlan(profileSource, tasks, {
        subject: autoStartPayload.subject || 'auto',
        durationMinutes: autoStartPayload.durationMinutes ?? autoStartPayload.duration ?? null,
        difficulty: autoStartPayload.difficulty || 'auto'
      })
    }
    return previewPlan
  }, [autoStartPayload, previewPlan, profileSource, session?.plan, tasks])

  const persistSession = useCallback(
    (nextSession) => {
      sessionRef.current = nextSession
      setSession(nextSession)
      if (user?.id) {
        saveExamSession(user.id, nextSession)
      }
    },
    [user?.id]
  )

  const startExam = useCallback(
    (plan = previewPlan) => {
      if (!plan?.questions?.length) return
      finishLockRef.current = false
      warningLockRef.current = false
      interruptionLockRef.current = false
      const nextSession = normalizeSession(plan)
      persistSession(nextSession)
      setScreen('running')
      setMessage(`Exam started: ${plan.subjectLabel} ${plan.durationMinutes} min`)
      setNote('')
    },
    [persistSession, previewPlan]
  )

  useEffect(() => {
    if (authLoading || profileLoading || dataLoading.tasks || dataLoading.sessions) return
    if (!user?.id) return

    const saved = loadExamSession(user.id)
    if (saved?.questions?.length) {
      sessionRef.current = saved
      finishLockRef.current = false
      warningLockRef.current = Boolean(saved.remainingSeconds <= 600)
      setSession(saved)
      setScreen('running')
      setMessage('Exam session restored')
      clearPendingExamPayload()
      return
    }

    if (autoStartPayload) {
      const plan = activePlan
      if (plan?.questions?.length) {
        startExam(plan)
        clearPendingExamPayload()
        return
      }
    }

    setScreen('setup')
    setMessage('Choose subject and duration')
  }, [
    activePlan,
    authLoading,
    autoStartPayload,
    dataLoading.sessions,
    dataLoading.tasks,
    profileLoading,
    startExam,
    user?.id
  ])

  const updateSession = useCallback(
    (updater) => {
      const current = sessionRef.current
      if (!current) return
      const nextSession = typeof updater === 'function' ? updater(current) : updater
      if (!nextSession) return
      persistSession(nextSession)
    },
    [persistSession]
  )

  const switchQuestion = useCallback(
    (index) => {
      updateSession((current) => {
        if (index < 0 || index >= current.questions.length) return current
        if (index === current.currentQuestionIndex) return current
        return {
          ...current,
          currentQuestionIndex: index,
          switchCount: current.isRunning ? current.switchCount + 1 : current.switchCount,
          updatedAt: new Date().toISOString()
        }
      })
      setMessage(`Question ${index + 1} selected`)
    },
    [updateSession]
  )

  const toggleCurrentQuestionComplete = useCallback(() => {
    updateSession((current) => {
      const index = current.currentQuestionIndex || 0
      const questions = current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, completed: !question.completed } : question
      )
      return {
        ...current,
        questions,
        updatedAt: new Date().toISOString()
      }
    })
    setMessage('Question state updated')
  }, [updateSession])

  const updateCurrentNotes = useCallback(
    (value) => {
      setNote(value)
      updateSession((current) => {
        const index = current.currentQuestionIndex || 0
        const questions = current.questions.map((question, questionIndex) =>
          questionIndex === index ? { ...question, notes: value } : question
        )
        return {
          ...current,
          questions,
          updatedAt: new Date().toISOString()
        }
      })
    },
    [updateSession]
  )

  const setConfidence = useCallback(
    (value) => {
      updateSession((current) => {
        const index = current.currentQuestionIndex || 0
        const questions = current.questions.map((question, questionIndex) =>
          questionIndex === index ? { ...question, confidence: Number(value) } : question
        )
        return {
          ...current,
          questions,
          updatedAt: new Date().toISOString()
        }
      })
    },
    [updateSession]
  )

  const togglePause = useCallback(() => {
    updateSession((current) => {
      const now = Date.now()
      if (current.isRunning) {
        return {
          ...current,
          isRunning: false,
          pauseCount: current.pauseCount + 1,
          updatedAt: new Date().toISOString(),
          pausedAt: now
        }
      }

      return {
        ...current,
        isRunning: true,
        lastTickAt: now,
        updatedAt: new Date().toISOString(),
        pausedAt: null
      }
    })
    setMessage(sessionRef.current?.isRunning ? 'Pause recorded' : 'Session resumed')
  }, [updateSession])
  const finishExam = useCallback(
    async (reason = 'manual', sessionOverride = null) => {
      if (finishLockRef.current) return null
      const finalSession = sessionOverride || sessionRef.current
      if (!finalSession) return null

      finishLockRef.current = true
      setSavingResult(true)

      const endedSession = {
        ...finalSession,
        isRunning: false,
        endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      const result = gradeExam(endedSession)

      if (user?.id) {
        saveExamResult(user.id, result)
        clearExamSession(user.id)
      }

      try {
        setSession(endedSession)
        sessionRef.current = endedSession
        clearPendingExamPayload()
        navigate('/exam-result', {
          replace: true,
          state: {
            result,
            reason
          }
        })
      } finally {
        setSavingResult(false)
      }

      return result
    },
    [navigate, user?.id]
  )

  useEffect(() => {
    if (!session || !session.isRunning) return undefined

    const interval = window.setInterval(() => {
      setSession((current) => {
        if (!current || !current.isRunning) return current

        const currentIndex = Math.min(
          current.currentQuestionIndex || 0,
          Math.max(0, current.questions.length - 1)
        )
        const questions = current.questions.map((question, index) =>
          index === currentIndex
            ? {
                ...question,
                timeSpentSeconds: (Number(question.timeSpentSeconds) || 0) + 1
              }
            : question
        )
        const nextRemaining = Math.max(0, (Number(current.remainingSeconds) || 0) - 1)
        const nextSession = {
          ...current,
          questions,
          remainingSeconds: nextRemaining,
          totalFocusTimeSeconds: (Number(current.totalFocusTimeSeconds) || 0) + 1,
          lastTickAt: Date.now(),
          updatedAt: new Date().toISOString(),
          isRunning: nextRemaining > 0
        }

        if (nextRemaining === 0 && !finishLockRef.current) {
          window.setTimeout(() => {
            void finishExam('time', nextSession)
          }, 0)
        }

        return nextSession
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [finishExam, session?.isRunning])

  useEffect(() => {
    if (!session || !user?.id) return
    saveExamSession(user.id, session)
  }, [session, user?.id])

  useEffect(() => {
    if (!session?.isRunning) return undefined

    const handleVisibilityChange = () => {
      if (!document.hidden) return
      if (interruptionLockRef.current) return
      interruptionLockRef.current = true
      setMessage('Stay on the exam page')
      updateSession((current) => ({
        ...current,
        interruptionCount: current.interruptionCount + 1,
        updatedAt: new Date().toISOString()
      }))
      window.setTimeout(() => {
        interruptionLockRef.current = false
      }, 1200)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [session?.isRunning, updateSession])

  useEffect(() => {
    if (!session?.remainingSeconds || warningLockRef.current) return
    if (session.remainingSeconds > 600) return

    warningLockRef.current = true
    setMessage('10 minutes remaining')
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20)
    }
  }, [session?.remainingSeconds])

  useEffect(() => {
    if (!note && session?.questions?.[session.currentQuestionIndex || 0]?.notes) {
      setNote(session.questions[session.currentQuestionIndex || 0].notes || '')
    }
  }, [note, session?.currentQuestionIndex, session?.questions])

  const handleGoBack = () => {
    if (session?.isRunning) {
      persistSession({ ...sessionRef.current, isRunning: false })
    }
    navigate('/dashboard')
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-white/70 backdrop-blur-xl">
          Loading exam environment...
        </div>
      </div>
    )
  }

  if (!user?.id) {
    return null
  }

  if (screen === 'setup' && !session) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-black text-white">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />

        <motion.div
          variants={sectionMotion}
          initial="initial"
          animate="animate"
          className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 md:px-6 md:py-8"
        >
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/75 backdrop-blur-xl transition hover:bg-white/10"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Exit
            </button>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3.5 py-2 text-xs font-semibold text-cyan-100">
              <GraduationCap className="h-3.5 w-3.5" />
              Exam Simulation
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.section
              variants={sectionMotion}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl md:p-6"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Setup</p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-5xl">
                Start Exam Simulation
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 md:text-base">
                Build a strict exam session from your weak areas or choose the subject, duration,
                and difficulty manually.
              </p>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/55">Subject</span>
                  <select
                    value={selectedSubject}
                    onChange={(event) => setSelectedSubject(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {SUBJECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-neutral-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/55">Duration</span>
                  <select
                    value={selectedDuration}
                    onChange={(event) => setSelectedDuration(
                      event.target.value === 'auto' ? 'auto' : Number(event.target.value)
                    )}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value} className="bg-neutral-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/55">
                    Difficulty
                  </span>
                  <select
                    value={selectedDifficulty}
                    onChange={(event) => setSelectedDifficulty(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                  >
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-neutral-900">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startExam(previewPlan)}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(139,92,246,0.35)]"
                >
                  Start Exam Simulation
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setSelectedSubject('auto')
                    setSelectedDuration('auto')
                    setSelectedDifficulty('auto')
                    setMessage('AI will choose the best exam setup')
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  AI Auto Select
                </motion.button>
              </div>
            </motion.section>

            <motion.section
              variants={sectionMotion}
              className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl md:p-6"
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/50">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                AI Preview
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {previewPlan.subjectLabel} {previewPlan.durationMinutes}-minute exam
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {previewPlan.reason}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Questions</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {previewPlan.questionCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">Pace</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {Math.max(45, previewPlan.recommendedPaceSeconds)}s
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/45">Likely focus area</p>
                <p className="mt-2 text-lg font-semibold text-cyan-100">
                  {getExamSubjectLabel(previewPlan.subject)}
                </p>
                <p className="mt-1 text-sm text-white/60">
                  Built from your current workload and weaker topics.
                </p>
              </div>

              <div className="mt-4 space-y-2 text-sm text-white/62">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-300" />
                  Strict countdown and minimal UI
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  Time per question is tracked
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-300" />
                  Final 10-minute warning
                </div>
              </div>
            </motion.section>
          </div>

          <AnimatePresence>
            {message ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mx-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72 backdrop-blur-xl"
              >
                {message}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const currentQuestion = session.questions[session.currentQuestionIndex || 0] || null
  const completedCount = session.questions.filter((question) => question.completed).length
  const totalQuestions = session.questions.length
  const progressPercent = totalQuestions ? Math.round((completedCount / totalQuestions) * 100) : 0
  const elapsedSeconds = session.durationMinutes * 60 - session.remainingSeconds
  const remainingDanger = session.remainingSeconds <= 600

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-neutral-950 to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_35%)]" />
      <motion.div
        variants={sectionMotion}
        initial="initial"
        animate="animate"
        className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 md:gap-6 md:px-6 md:py-6"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/75 backdrop-blur-xl transition hover:bg-white/10"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit
          </button>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-2 text-xs text-white/70 backdrop-blur-xl">
            <GraduationCap className="h-3.5 w-3.5 text-cyan-300" />
            {session.subjectLabel} • {session.difficulty}
          </div>

          <button
            type="button"
            onClick={togglePause}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/75 backdrop-blur-xl transition hover:bg-white/10"
          >
            {session.isRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {session.isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="flex min-h-0 flex-col gap-4">
            <motion.section
              variants={sectionMotion}
              className={`rounded-[28px] border bg-white/5 p-5 backdrop-blur-2xl md:p-6 ${
                remainingDanger
                  ? 'border-rose-400/25 shadow-[0_0_36px_rgba(244,63,94,0.12)]'
                  : 'border-white/10'
              }`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Exam timer</p>
                  <p className="mt-2 text-5xl font-bold tracking-[0.04em] md:text-7xl">
                    {formatTime(session.remainingSeconds)}
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    {session.isRunning ? 'Countdown running' : 'Paused'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-[260px] md:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Completed</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{completedCount}/{totalQuestions}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/45">Progress</p>
                    <p className="mt-2 text-2xl font-semibold text-cyan-200">{progressPercent}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`h-full rounded-full ${
                    remainingDanger
                      ? 'bg-gradient-to-r from-rose-400 to-orange-400'
                      : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500'
                  }`}
                  initial={false}
                  animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatTime(elapsedSeconds)} elapsed
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  <TimerReset className="h-3.5 w-3.5" />
                  {session.pauseCount} pauses
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {session.switchCount} switches
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {session.interruptionCount} interruptions
                </span>
              </div>

              <AnimatePresence>
                {remainingDanger ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                  >
                    Final 10 minutes. Keep pace tight.
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.section>

            <motion.section
              variants={sectionMotion}
              className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl md:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/50">Current question</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
                    {currentQuestion?.title || 'Question'}
                  </h2>
                  <p className="mt-1 text-sm text-white/60">
                    {currentQuestion?.subjectLabel || getExamSubjectLabel(session.subject)} • {currentQuestion?.difficulty || session.difficulty}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/70">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  {session.plan?.reason ? 'AI built' : 'Strict mode'}
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-white/10 bg-black/30 p-5">
                <p className="text-sm leading-7 text-white/80">
                  {currentQuestion?.prompt || 'No prompt available.'}
                </p>

                <textarea
                  value={note}
                  onChange={(event) => updateCurrentNotes(event.target.value)}
                  placeholder="Optional scratch notes..."
                  className="mt-4 min-h-[120px] w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/40"
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleCurrentQuestionComplete}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {currentQuestion?.completed ? 'Unmark done' : 'Mark done'}
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/65">
                    <Clock3 className="h-3.5 w-3.5" />
                    {currentQuestion?.timeSpentSeconds || 0}s on this question
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/65">
                  <span>Confidence</span>
                  <select
                    value={currentQuestion?.confidence || 3}
                    onChange={(event) => setConfidence(event.target.value)}
                    className="bg-transparent text-white outline-none"
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value} className="bg-neutral-900">
                        {value}/5
                      </option>
                    ))}
                  </select>
                </label>
                {currentQuestion?.source === 'task' ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/65">
                    <Target className="h-3.5 w-3.5 text-cyan-300" />
                    Linked task
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/65">
                    <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                    AI fallback
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => switchQuestion(Math.max(0, (session.currentQuestionIndex || 0) - 1))}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() =>
                    switchQuestion(
                      Math.min(session.questions.length - 1, (session.currentQuestionIndex || 0) + 1)
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-white/10"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.section>
          </div>

          <motion.aside
            variants={sectionMotion}
            className="flex min-h-0 flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl md:p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">Questions</p>
              <p className="text-xs text-white/55">{completedCount}/{totalQuestions}</p>
            </div>

            <div className="space-y-2 overflow-y-auto pr-1">
              {session.questions.map((question, index) => {
                const active = index === (session.currentQuestionIndex || 0)
                return (
                  <button
                    key={question.id || `${index}`}
                    type="button"
                    onClick={() => switchQuestion(index)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-cyan-400/25 bg-cyan-500/12 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                        : 'border-white/10 bg-black/25 hover:bg-white/8'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                          {index + 1}. {question.title}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {question.subjectLabel} • {question.difficulty}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-white/55">
                        <span>{question.completed ? 'Done' : 'Open'}</span>
                        <span>{formatTime(question.timeSpentSeconds || 0)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/50">Session controls</p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={togglePause}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  {session.isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {session.isRunning ? 'Pause exam' : 'Resume exam'}
                </button>
                <button
                  type="button"
                  onClick={() => void finishExam('manual')}
                  disabled={savingResult}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_26px_rgba(139,92,246,0.3)] transition hover:scale-[1.01] disabled:opacity-60"
                >
                  {savingResult ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent" /> : null}
                  End exam
                </button>
              </div>
            </div>
          </motion.aside>
        </div>

        <AnimatePresence>
          {message ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto w-full max-w-5xl rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/72 backdrop-blur-xl"
            >
              {message}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default ExamSimulation
