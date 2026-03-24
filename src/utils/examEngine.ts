import { toCanonicalProfile } from './aiProfiling.js'
import {
  buildMemoryGraphSnapshot,
  getMemoryGraphSummary,
  inferConceptPathFromTask,
  mergeMemoryGraphIntoPersonalization,
  updateMemoryGraphFromExamResult
} from './memoryGraph.ts'

const SESSION_PREFIX = 'easybac:exam-session'
const RESULT_PREFIX = 'easybac:exam-result'
const MAX_HISTORY = 5

const isBrowser = typeof window !== 'undefined'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const readJson = (key, fallback = null) => {
  if (!isBrowser) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage failures.
  }
}

const removeJson = (key) => {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

const getKey = (prefix, userId) => `${prefix}:${userId || 'guest'}`

const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const SUBJECT_LABELS = {
  math: 'Math',
  physics: 'Physics',
  philosophie: 'Philosophie',
  svt: 'SVT',
  english: 'English'
}

const SUBJECT_ALIASES = {
  math: ['math', 'maths', 'mathematics', 'riyadiyat', 'رياضيات'],
  physics: ['physics', 'physique', 'fizik', 'فيزياء'],
  philosophie: ['philosophie', 'philo', 'philosophy', 'falsafa', 'فلسفة'],
  svt: ['svt', 'science', 'sciences', 'biology', 'biologie', 'bio', 'علوم'],
  english: ['english', 'anglais', 'anglish', 'الانجليزية', 'english language']
}

const DIFFICULTY_LABELS = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard'
}

const SUBJECT_QUESTION_BANK = {
  math: [
    'Solve an algebra problem under time pressure.',
    'Complete a short derivation and justify each step.',
    'Answer a mixed arithmetic and reasoning question.'
  ],
  physics: [
    'Explain the concept and apply it to a practical situation.',
    'Solve a short mechanics or energy problem.',
    'Interpret a physical diagram and state the result.'
  ],
  philosophie: [
    'Build a concise argumentative answer with one clear thesis.',
    'Compare two perspectives and defend one of them.',
    'Write a structured short response with examples.'
  ],
  svt: [
    'Explain a biological process in sequence.',
    'Identify the relevant parts of a scientific diagram.',
    'Connect a concept to a real-life phenomenon.'
  ],
  english: [
    'Answer a short comprehension question in full sentences.',
    'Rewrite an idea clearly using precise vocabulary.',
    'Write a concise response with correct structure.'
  ]
}

const hasSameSubject = (taskSubject = '', targetSubject = '') => {
  const normalizedTask = normalize(taskSubject)
  const normalizedTarget = normalize(targetSubject)
  if (!normalizedTask || !normalizedTarget) return false
  if (normalizedTask === normalizedTarget) return true

  const taskCanonical = Object.entries(SUBJECT_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalize(alias) === normalizedTask)
  )?.[0]
  const targetCanonical = Object.entries(SUBJECT_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalize(alias) === normalizedTarget)
  )?.[0]

  return Boolean(taskCanonical && targetCanonical && taskCanonical === targetCanonical)
}

const normalizeSubject = (value = '') => {
  const normalized = normalize(value)
  if (!normalized) return ''

  for (const [canonical, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => normalize(alias) === normalized)) {
      return canonical
    }
  }

  return normalized
}

export const getExamSubjectLabel = (subject = '') => {
  const normalized = normalizeSubject(subject)
  return SUBJECT_LABELS[normalized] || (subject ? String(subject) : 'General')
}

const getProfile = (user = {}) => {
  const profile =
    user?.personalization ||
    user?.profile ||
    user?.preferences ||
    user ||
    {}

  return toCanonicalProfile(profile)
}

const getPendingTasks = (tasks = []) =>
  tasks.filter(
    (task) =>
      !(
        task?.completed === true ||
        task?.status === 'completed' ||
        task?.status === 'on_hold'
      )
  )

const getDueDateMs = (task) => {
  if (!task?.due_date) return null
  const dueMs = new Date(`${task.due_date}T00:00:00`).getTime()
  return Number.isNaN(dueMs) ? null : dueMs
}

const getTaskFocusTime = (task) =>
  Number(task?.total_focus_time ?? task?.totalFocusTime ?? 0) || 0

const getTaskSessionsCount = (task) =>
  Number(task?.sessions_count ?? task?.sessionsCount ?? 0) || 0

const getTaskScore = (task, subject) => {
  const now = Date.now()
  let score = 0

  if (hasSameSubject(task?.subject, subject)) score += 100

  const dueMs = getDueDateMs(task)
  if (dueMs) {
    const diffDays = Math.floor((dueMs - now) / (24 * 60 * 60 * 1000))
    if (diffDays < 0) score += 50
    else if (diffDays === 0) score += 32
    else if (diffDays === 1) score += 24
    else if (diffDays <= 3) score += 12
  }

  score += Math.max(0, 30 - getTaskFocusTime(task) * 0.25)
  score += Math.max(0, 18 - getTaskSessionsCount(task) * 3)

  return score
}

const rankTasksForExam = (tasks = [], subject = '') => {
  const pending = getPendingTasks(tasks)
  return [...pending].sort((a, b) => {
    const scoreDiff = getTaskScore(b, subject) - getTaskScore(a, subject)
    if (scoreDiff !== 0) return scoreDiff
    return String(a?.title || '').localeCompare(String(b?.title || ''))
  })
}

const selectSubject = (profile, tasks, manualSubject = '') => {
  const explicit = normalizeSubject(manualSubject)
  if (explicit && explicit !== 'auto') return explicit

  const memoryGraph = buildMemoryGraphSnapshot({ personalization: profile || {}, tasks })
  const graphSummary = getMemoryGraphSummary(memoryGraph)
  const graphWeakSubject = normalizeSubject(graphSummary.weakest?.subjectKey || '')
  if (graphWeakSubject) return graphWeakSubject

  const weakSubjects = Array.isArray(profile?.weakSubjects) ? profile.weakSubjects : []
  if (weakSubjects.length > 0) {
    const firstWeak = normalizeSubject(weakSubjects[0])
    if (firstWeak) return firstWeak
  }

  const ranked = rankTasksForExam(tasks)
  const bestTaskSubject = normalizeSubject(ranked[0]?.subject || '')
  if (bestTaskSubject) return bestTaskSubject

  return 'math'
}

const selectDifficulty = (profile, manualDifficulty = '') => {
  const normalized = normalize(manualDifficulty)
  if (normalized && normalized !== 'auto') return normalized
  if (profile.level === 'Good') return 'hard'
  if (profile.level === 'Struggling') return 'easy'
  return 'medium'
}

const selectDuration = (profile, tasks, manualDurationMinutes = null) => {
  const manual = Number(manualDurationMinutes)
  if (Number.isFinite(manual) && manual > 0) {
    return clamp(Math.round(manual), 30, 180)
  }

  const pendingCount = getPendingTasks(tasks).length
  let base = profile.level === 'Good' ? 90 : profile.level === 'Struggling' ? 60 : 75

  if (pendingCount >= 10) base += 15
  else if (pendingCount <= 3) base -= 10

  if (Array.isArray(profile.weakSubjects) && profile.weakSubjects.length >= 2) {
    base -= 5
  }

  if (profile.studyHours === '4h+') {
    base += 10
  } else if (profile.studyHours === 'Less than 2h') {
    base -= 10
  }

  return clamp(base, 30, 180)
}

const buildQuestionTitle = (subject, index, difficulty) => {
  const label = getExamSubjectLabel(subject)
  const prefixes = {
    easy: ['Short check', 'Quick prompt', 'Basic recall'],
    medium: ['Core check', 'Main problem', 'Focused question'],
    hard: ['Challenge question', 'Advanced problem', 'Deep reasoning']
  }
  const choices = prefixes[difficulty] || prefixes.medium
  return `${choices[index % choices.length]} ${index + 1} — ${label}`
}

const buildQuestionFromTask = (task, subject, index, difficulty) => {
  const label = getExamSubjectLabel(task?.subject || subject)
  const title = task?.title || buildQuestionTitle(subject, index, difficulty)
  const taskFocus = getTaskFocusTime(task)
  const expectedMinutes = clamp(
    Math.round(Math.max(4, 10 - taskFocus * 0.1)),
    4,
    12
  )
  const concept = inferConceptPathFromTask(task, { weakSubjects: [subject] })

  return {
    id: `task-${task?.id || index}-${index}`,
    title,
    prompt:
      difficulty === 'hard'
        ? `Explain, solve, or justify the task: ${title}.`
        : `Work through the exam-style version of: ${title}.`,
    subject: normalizeSubject(task?.subject || subject) || normalizeSubject(subject),
    subjectLabel: label,
    topic: concept.topic,
    topicLabel: concept.topic,
    subtopic: concept.subtopic,
    subtopicLabel: concept.subtopic,
    conceptLabel: `${concept.subject} / ${concept.topic} / ${concept.subtopic}`,
    difficulty,
    expectedMinutes,
    source: 'task',
    taskId: task?.id || null,
    completed: false,
    timeSpentSeconds: 0,
    notes: '',
    confidence: 3,
    tags: [label, concept.topic, concept.subtopic].filter(Boolean)
  }
}

const buildFallbackQuestions = (subject, count, difficulty) => {
  const label = getExamSubjectLabel(subject)
  const bank = SUBJECT_QUESTION_BANK[normalizeSubject(subject)] || SUBJECT_QUESTION_BANK.math

  return Array.from({ length: count }, (_, index) => {
    const prompt = bank[index % bank.length]
    const title = buildQuestionTitle(subject, index, difficulty)
    const concept = inferConceptPathFromTask(
      { subject, title: `${title} ${prompt}` },
      { weakSubjects: [subject] }
    )
    return {
      id: `exam-${normalizeSubject(subject) || 'general'}-${index + 1}`,
      title,
      prompt:
        difficulty === 'hard'
          ? `${prompt} Give the full reasoning behind your answer.`
          : difficulty === 'easy'
            ? `${prompt} Keep your answer concise and structured.`
            : prompt,
      subject: normalizeSubject(subject) || 'math',
      subjectLabel: label,
      topic: concept.topic,
      topicLabel: concept.topic,
      subtopic: concept.subtopic,
      subtopicLabel: concept.subtopic,
      conceptLabel: `${concept.subject} / ${concept.topic} / ${concept.subtopic}`,
      difficulty,
      expectedMinutes: clamp(difficulty === 'hard' ? 10 : difficulty === 'easy' ? 6 : 8, 4, 14),
      source: 'ai',
      taskId: null,
      completed: false,
      timeSpentSeconds: 0,
      notes: '',
      confidence: 3,
      tags: [label, concept.topic, concept.subtopic].filter(Boolean)
    }
  })
}

export const buildExamSimulationPlan = (user, tasks = [], options = {}) => {
  const profile = getProfile(user)
  const subject = selectSubject(profile, tasks, options.subject || options.manualSubject)
  const difficulty = selectDifficulty(profile, options.difficulty)
  const durationMinutes = selectDuration(profile, tasks, options.durationMinutes)
  const questionCount = clamp(Math.round(durationMinutes / 12), 5, 12)
  const rankedTasks = rankTasksForExam(tasks, subject)
  const selectedTasks = rankedTasks.slice(0, questionCount)
  const taskQuestions = selectedTasks.map((task, index) =>
    buildQuestionFromTask(task, subject, index, difficulty)
  )

  const remainingCount = Math.max(0, questionCount - taskQuestions.length)
  const fallbackQuestions = remainingCount
    ? buildFallbackQuestions(subject, remainingCount, difficulty)
    : []

  const questions = [...taskQuestions, ...fallbackQuestions].map((question, index) => ({
    ...question,
    id: question.id || `exam-question-${index + 1}`,
    order: index + 1
  }))

  const manualSubject = Boolean(options.subject && normalize(options.subject) !== 'auto')
  const manualDuration = Number.isFinite(Number(options.durationMinutes))
  const manualDifficulty = Boolean(options.difficulty && normalize(options.difficulty) !== 'auto')

  return {
    examId: `exam-${Date.now()}`,
    subject,
    subjectLabel: getExamSubjectLabel(subject),
    difficulty,
    durationMinutes,
    questionCount: questions.length,
    warningMinutes: 10,
    recommendedPaceSeconds: Math.max(45, Math.round((durationMinutes * 60) / Math.max(1, questions.length))),
    source: manualSubject || manualDuration || manualDifficulty ? 'manual' : 'ai',
    autoSelected: !(manualSubject || manualDuration || manualDifficulty),
    reason:
      questions.length > 0
        ? `${getExamSubjectLabel(subject)} ${durationMinutes}-minute simulation built from your current workload and weak areas.`
        : `Generic ${getExamSubjectLabel(subject)} simulation ready.`,
    questions,
    generatedAt: new Date().toISOString()
  }
}

export const saveExamSession = (userId, session) => {
  if (!userId || !session) return session
  writeJson(getKey(SESSION_PREFIX, userId), session)
  return session
}

export const loadExamSession = (userId) => readJson(getKey(SESSION_PREFIX, userId), null)

export const clearExamSession = (userId) => {
  if (!userId) return
  removeJson(getKey(SESSION_PREFIX, userId))
}

export const saveExamResult = (userId, result) => {
  if (!userId || !result) return result
  const key = getKey(RESULT_PREFIX, userId)
  const existing = readJson(key, [])
  const current = Array.isArray(existing) ? existing : []
  const next = [result, ...current.filter((item) => item?.examId !== result.examId)].slice(0, MAX_HISTORY)
  writeJson(key, next)
  return result
}

export const loadLatestExamResult = (userId) => {
  const history = readJson(getKey(RESULT_PREFIX, userId), [])
  if (!Array.isArray(history) || history.length === 0) return null
  return history[0]
}

export const gradeExam = (sessionData = {}) => {
  const plan = sessionData.plan || {}
  const questions = Array.isArray(sessionData.questions) ? sessionData.questions : Array.isArray(plan.questions) ? plan.questions : []
  const durationMinutes = Number(sessionData.durationMinutes || plan.durationMinutes || 0) || 0
  const pauseCount = Number(sessionData.pauseCount || 0) || 0
  const switchCount = Number(sessionData.switchCount || 0) || 0
  const interruptionCount = Number(sessionData.interruptionCount || 0) || 0
  const finalPauseSeconds = Number(sessionData.pausedSeconds || 0) || 0

  const questionBreakdown = questions.map((question, index) => {
    const timeSpentSeconds = Number(question.timeSpentSeconds || 0) || 0
    const expectedSeconds = Number(question.expectedMinutes || 0) * 60 || Math.max(180, Math.round((durationMinutes * 60) / Math.max(1, questions.length || 1)))
    const completed = question.completed === true
    const efficiency = expectedSeconds > 0 ? clamp(Math.round(100 - Math.abs(timeSpentSeconds - expectedSeconds) / Math.max(1, expectedSeconds) * 100), 0, 100) : 0

    return {
      id: question.id || `question-${index + 1}`,
      title: question.title || `Question ${index + 1}`,
      prompt: question.prompt || '',
      subject: question.subject || plan.subject || 'general',
      subjectLabel: getExamSubjectLabel(question.subject || plan.subject || 'general'),
      topic: question.topic || question.topicLabel || null,
      topicLabel: question.topicLabel || question.topic || null,
      subtopic: question.subtopic || question.subtopicLabel || null,
      subtopicLabel: question.subtopicLabel || question.subtopic || null,
      conceptLabel:
        question.conceptLabel ||
        [
          getExamSubjectLabel(question.subject || plan.subject || 'general'),
          question.topicLabel || question.topic || null,
          question.subtopicLabel || question.subtopic || null
        ]
          .filter(Boolean)
          .join(' / '),
      difficulty: question.difficulty || plan.difficulty || 'medium',
      timeSpentSeconds,
      expectedSeconds,
      completed,
      confidence: Number(question.confidence || 3) || 3,
      source: question.source || 'task',
      efficiency
    }
  })

  const completedQuestions = questionBreakdown.filter((item) => item.completed)
  const completionRate = questionBreakdown.length
    ? completedQuestions.length / questionBreakdown.length
    : 0

  const totalTimeSpentSeconds = questionBreakdown.reduce((sum, item) => sum + item.timeSpentSeconds, 0)
  const expectedSecondsPerQuestion = questionBreakdown.length
    ? Math.round((durationMinutes * 60) / questionBreakdown.length)
    : 0
  const averageSecondsPerQuestion = questionBreakdown.length
    ? Math.round(totalTimeSpentSeconds / questionBreakdown.length)
    : 0

  const averageEfficiency = questionBreakdown.length
    ? Math.round(
        questionBreakdown.reduce((sum, item) => sum + item.efficiency, 0) / questionBreakdown.length
      )
    : 0

  const timeEfficiency = clamp(
    Math.round(
      100 -
        Math.abs(averageSecondsPerQuestion - expectedSecondsPerQuestion) * 0.55 -
        pauseCount * 7 -
        switchCount * 4 -
        interruptionCount * 8 -
        Math.min(20, Math.round(finalPauseSeconds / 30))
    ),
    0,
    100
  )

  const stabilityScore = clamp(
    Math.round(100 - pauseCount * 8 - switchCount * 5 - interruptionCount * 11),
    0,
    100
  )

  const accuracyScore = clamp(Math.round(completionRate * 100), 0, 100)

  const overallScore = clamp(
    Math.round(accuracyScore * 0.45 + timeEfficiency * 0.35 + stabilityScore * 0.2),
    0,
    100
  )

  const bySubject = questionBreakdown.reduce((acc, item) => {
    const subjectKey = normalizeSubject(item.subject) || 'general'
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        subject: subjectKey,
        label: getExamSubjectLabel(subjectKey),
        total: 0,
        completed: 0,
        timeSpentSeconds: 0,
        expectedSeconds: 0
      }
    }
    acc[subjectKey].total += 1
    acc[subjectKey].completed += item.completed ? 1 : 0
    acc[subjectKey].timeSpentSeconds += item.timeSpentSeconds
    acc[subjectKey].expectedSeconds += item.expectedSeconds
    return acc
  }, {})

  const weakTopics = Object.values(bySubject)
    .filter((entry) => {
      const averageTime = entry.total > 0 ? entry.timeSpentSeconds / entry.total : 0
      const averageExpected = entry.total > 0 ? entry.expectedSeconds / entry.total : 0
      return entry.completed / Math.max(1, entry.total) < 0.7 || averageTime > averageExpected * 1.15
    })
    .map((entry) => entry.label)

  const strongTopics = Object.values(bySubject)
    .filter((entry) => {
      const averageTime = entry.total > 0 ? entry.timeSpentSeconds / entry.total : 0
      const averageExpected = entry.total > 0 ? entry.expectedSeconds / entry.total : 0
      return entry.completed / Math.max(1, entry.total) >= 0.8 && averageTime <= averageExpected * 1.05
    })
    .map((entry) => entry.label)

  const delayPatterns = []
  if (averageSecondsPerQuestion > expectedSecondsPerQuestion * 1.2) {
    delayPatterns.push('You spent too much time on easy questions.')
  }
  if (pauseCount >= 2) {
    delayPatterns.push('You paused often under pressure.')
  }
  if (switchCount >= 3) {
    delayPatterns.push('You switched tasks or questions too often.')
  }
  if (completionRate < 0.7) {
    delayPatterns.push('Several questions were left unfinished.')
  }

  const feedback = []
  if (overallScore >= 80) {
    feedback.push('Strong exam control. You kept pace and finished the highest-value work.')
  } else if (overallScore >= 60) {
    feedback.push('Solid exam attempt, but there is still room to reduce wasted time.')
  } else {
    feedback.push('The exam was unstable. You need tighter pacing and fewer interruptions.')
  }

  if (weakTopics.length > 0) {
    feedback.push(`Your main weak area was ${weakTopics[0]}.`)
  }

  if (delayPatterns[0]) {
    feedback.push(delayPatterns[0])
  }

  const nextSessionMinutes = overallScore >= 80 ? 75 : overallScore >= 60 ? 45 : 30
  const improvementPlan = [
    weakTopics[0]
      ? `Review ${weakTopics[0]} before the next session.`
      : 'Review the questions you left incomplete.',
    `Use a ${nextSessionMinutes}-minute focused block next time.`,
    completionRate < 0.8
      ? 'Practice finishing questions faster instead of overworking the first ones.'
      : 'Keep the current pace and reduce avoidable pauses.'
  ]

  const subjectStrengths = Object.values(bySubject).reduce((acc, entry) => {
    const completionRatio = entry.total > 0 ? entry.completed / entry.total : 0
    const averageTime = entry.total > 0 ? entry.timeSpentSeconds / entry.total : 0
    const averageExpected = entry.total > 0 ? entry.expectedSeconds / entry.total : 0
    const score = clamp(
      Math.round(completionRatio * 100 - Math.max(0, (averageTime - averageExpected) / Math.max(1, averageExpected)) * 40),
      0,
      100
    )
    acc[entry.label] = score
    return acc
  }, {})

  return {
    examId: sessionData.examId || plan.examId || `exam-${Date.now()}`,
    subject: plan.subject || sessionData.subject || 'general',
    subjectLabel: getExamSubjectLabel(plan.subject || sessionData.subject || 'general'),
    difficulty: plan.difficulty || sessionData.difficulty || 'medium',
    durationMinutes,
    questionCount: questionBreakdown.length,
    overallScore,
    accuracyScore,
    timeEfficiency,
    stabilityScore,
    averageEfficiency,
    completionRate,
    averageSecondsPerQuestion,
    expectedSecondsPerQuestion,
    pauseCount,
    switchCount,
    interruptionCount,
    totalTimeSpentSeconds,
    weakTopics,
    strongTopics,
    delayPatterns,
    feedback,
    improvementPlan,
    breakdown: questionBreakdown,
    completedAt: new Date().toISOString(),
    nextSessionMinutes,
    memoryUpdate: {
      subjectStrengths,
      topicWeaknesses: weakTopics,
      conceptWeaknesses: weakTopics,
      conceptStrengths: strongTopics
    }
  }
}

export const mergeExamResultIntoPersonalization = (personalization = {}, examResult = {}) => {
  const canonical = toCanonicalProfile(personalization || {})
  const existingHistory = Array.isArray(personalization?.examHistory)
    ? personalization.examHistory
    : []
  const currentGraph = buildMemoryGraphSnapshot({
    personalization: canonical,
    tasks: []
  })
  const nextGraph = updateMemoryGraphFromExamResult(currentGraph, examResult)
  const graphSummary = getMemoryGraphSummary(nextGraph)

  const nextHistory = [
    {
      examId: examResult.examId,
      score: examResult.overallScore,
      subject: examResult.subjectLabel || examResult.subject,
      difficulty: examResult.difficulty,
      durationMinutes: examResult.durationMinutes,
      weakTopics: examResult.weakTopics || [],
      strongTopics: examResult.strongTopics || [],
      completedAt: examResult.completedAt
    },
    ...existingHistory.filter((item) => item?.examId !== examResult.examId)
  ].slice(0, MAX_HISTORY)

  return {
    ...personalization,
    ...canonical,
    isPersonalized: personalization?.isPersonalized ?? canonical.isPersonalized ?? true,
    subjectStrengths: {
      ...(personalization?.subjectStrengths || {}),
      ...(examResult.memoryUpdate?.subjectStrengths || {})
    },
    topicWeaknesses: Array.from(
      new Set([
        ...(Array.isArray(personalization?.topicWeaknesses) ? personalization.topicWeaknesses : []),
        ...(examResult.memoryUpdate?.topicWeaknesses || [])
      ])
    ).slice(0, 10),
    memoryGraph: nextGraph,
    memoryGraphUpdatedAt: new Date().toISOString(),
    memoryGraphSummary: {
      weakest: graphSummary.weakest,
      strongest: graphSummary.strongest,
      subjectStrengths: graphSummary.subjectStrengths,
      topicStrengths: graphSummary.topicStrengths.slice(0, 8)
    },
    examHistory: nextHistory,
    lastExamResult: {
      examId: examResult.examId,
      score: examResult.overallScore,
      subject: examResult.subjectLabel || examResult.subject,
      difficulty: examResult.difficulty,
      durationMinutes: examResult.durationMinutes,
      completedAt: examResult.completedAt,
      feedback: examResult.feedback || [],
      improvementPlan: examResult.improvementPlan || []
    },
    ai: {
      ...(personalization?.ai || {}),
      lastExamScore: examResult.overallScore,
      lastExamDate: examResult.completedAt,
      lastExamSubject: examResult.subjectLabel || examResult.subject,
      lastExamResult: {
        score: examResult.overallScore,
        subject: examResult.subjectLabel || examResult.subject,
        durationMinutes: examResult.durationMinutes,
        completedAt: examResult.completedAt
      }
    }
  }
}

export const getLatestExamProgress = (userId) => loadExamSession(userId)
