import { toDateKey } from './dateUtils.js'
import { getBestTask, getShortMessage } from './aiEngine.ts'
import { buildAutopilotPlan, queueAutopilotLaunch } from './autopilotEngine.ts'
import { buildExamSimulationPlan } from './examEngine.ts'
import { setActiveFocusTaskId } from './focusTasks.js'
import { isOverdueTask } from './taskStats.js'

export const PENDING_STUDY_ACTION_KEY = 'assistant-pending-study-action'
export const PENDING_EXAM_ACTION_KEY = 'assistant-pending-exam-action'

const SUBJECT_ALIASES = {
  math: [
    'math',
    'maths',
    'mathematics',
    'mathematiques',
    'mathématique',
    'riyadiyat',
    'رياضيات'
  ],
  physics: ['physics', 'physic', 'physique', 'fizik', 'فيزياء'],
  philosophie: ['philosophy', 'philosophie', 'philo', 'falsafa', 'فلسفة'],
  svt: ['svt', 'science', 'sciences', 'biology', 'biologie', 'bio', 'علوم'],
  english: ['english', 'anglais', 'anglish', 'انجليزية']
}

const ROUTE_ALIASES = {
  dashboard: '/dashboard',
  home: '/dashboard',
  accueil: '/dashboard',
  tasks: '/tasks',
  task: '/tasks',
  todo: '/tasks',
  tache: '/tasks',
  taches: '/tasks',
  study: '/study',
  focus: '/study',
  session: '/study',
  analytics: '/analytics',
  stats: '/analytics',
  statistic: '/analytics',
  statistiques: '/analytics',
  insights: '/analytics',
  pricing: '/pricing',
  tarifs: '/pricing',
  payment: '/payment',
  paiement: '/payment',
  donate: '/donate',
  donation: '/donate',
  contact: '/contact',
  support: '/contact',
  profile: '/personalization',
  profil: '/personalization',
  personalization: '/personalization',
  personnalisation: '/personalization'
}

const DATE_ALIASES = {
  today: ['today', 'aujourdhui', 'aujourd hui', 'lyoum', 'اليوم'],
  tomorrow: ['tomorrow', 'demain', 'ghdda', 'ghada', 'ghdwa', 'غدا'],
  nextWeek: ['next week', 'semaine prochaine', 'la semaine prochaine', 'simana jaya', 'الأسبوع الجاي']
}

const CREATE_TASK_PREFIXES = [
  'create task',
  'add task',
  'new task',
  'create a task',
  'add a task',
  'cree tache',
  'creer tache',
  'cree une tache',
  'creer une tache',
  'ajoute tache',
  'ajoute une tache',
  'nouvelle tache',
  'zid task',
  'dir task',
  'sawb task',
  'ضيف تاسك',
  'انشئ مهمة'
]

const START_PREFIXES = [
  'start',
  'begin',
  'launch',
  'bda',
  'abda',
  'commence',
  'demarre',
  'démarre',
  'lance',
  'ابدأ'
]

const START_RECOMMENDED_PATTERNS = [
  'start recommended task',
  'start best task',
  'focus recommended',
  'bda recommended task',
  'bda best task',
  'commence la meilleure tache',
  'd??marre la meilleure tache',
  '???????? ???????? ????????'
]

const AUTOPILOT_PATTERNS = [
  'start autopilot',
  'autopilot',
  'focus autopilot',
  'bda autopilot',
  'demarre autopilot',
  'd??marre autopilot',
  'lance autopilot',
  'mode autopilot'
]

const EXAM_PATTERNS = [
  'start exam simulation',
  'start exam',
  'exam simulation',
  'simulate exam',
  'exam mode',
  'mode examen',
  'start exam mode',
  'bda exam',
  'bda examen',
  'demarre exam',
  'demarre examen',
  'lance exam',
  'lance examen',
  'commence exam',
  'commence examen',
  'simulation examen'
]

const FREE_FOCUS_PATTERNS = [
  'free focus',
  'free study',
  'free session',
  'session libre',
  'etude libre',
  'focus libre',
  'session hurra',
  'session free'
]

const POMODORO_PATTERNS = ['pomodoro', 'pomodorro', 'pomodor']

const COMPLETE_PREFIXES = [
  'mark',
  'complete',
  'finish',
  'done',
  'dir done',
  'marque',
  'termine',
  'terminé',
  'complete la tache',
  'sali',
  'kmmel',
  'kamel',
  'كمل',
  'انهي'
]

const DELETE_PREFIXES = [
  'delete',
  'remove',
  'erase',
  'supprime',
  'supprimer',
  'efface',
  'mseh',
  'مسح',
  'احذف'
]

const HOLD_PREFIXES = [
  'hold',
  'on hold',
  'pause task',
  'put on hold',
  'mets en pause',
  'mets en attente',
  'en pause',
  'en attente',
  'waqef',
  'hbet',
  'khlliha hold',
  'وقف',
  'علق'
]

const CLEAR_OVERDUE_PATTERNS = [
  'clear overdue',
  'clear overdue tasks',
  'delete overdue tasks',
  'remove overdue tasks',
  'supprime les taches en retard',
  'supprimer les taches en retard',
  'mseh tasks li fato due date',
  'mseh tasks li fatu',
  'احذف المهام المتأخرة'
]

const NAVIGATION_PREFIXES = [
  'go to',
  'open',
  'show',
  'ouvre',
  'va a',
  'aller a',
  'sir l',
  'sir li',
  'mshi l',
  '7ell',
  'افتح'
]

const PAUSE_PATTERNS = [
  'pause',
  'pause timer',
  'pause focus',
  'pause session',
  'pause le timer',
  'pause la session',
  'waqef',
  'waqef timer',
  'waqef focus',
  'stop',
  'arreter',
  'arrêter',
  'وقف'
]

const RESUME_PATTERNS = [
  'resume',
  'resume focus',
  'resume timer',
  'resume session',
  'continue',
  'continue focus',
  'reprends',
  'reprends focus',
  'continuer',
  'kammel',
  'kmel',
  'كمل'
]

const FINISH_PATTERNS = [
  'end session',
  'finish session',
  'stop session',
  'save session',
  'end focus',
  'finish focus',
  'sali session',
  'save focus',
  'termine la session',
  'enregistre la session',
  'أنهِ الجلسة'
]

const FILLER_WORDS = [
  'for',
  'the',
  'a',
  'an',
  'la',
  'le',
  'les',
  'une',
  'un',
  'dial',
  'dyal',
  'de',
  'du',
  'des',
  'task',
  'tasks',
  'tache',
  'taches',
  'mouhima',
  'had',
  'hada',
  'هذه',
  'مهمة'
]

const DANGEROUS_INTENTS = new Set(['delete_task', 'clear_overdue'])
const RANGE_LIMITS = { min: 10, max: 120 }
let audioContextRef = null

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const sanitize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getSpeechRecognitionConstructor = () => {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const hasAnyPhrase = (text, phrases = []) => {
  const normalized = sanitize(text)
  return phrases.some((phrase) => normalized.includes(sanitize(phrase)))
}

const startsWithAnyPhrase = (text, phrases = []) => {
  const normalized = sanitize(text)
  return phrases.some((phrase) => normalized.startsWith(sanitize(phrase)))
}

const stripLeadingPhrase = (text, phrases = []) => {
  const normalized = sanitize(text)
  const ordered = [...phrases].sort((a, b) => b.length - a.length)
  for (const phrase of ordered) {
    const safe = sanitize(phrase).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const next = normalized.replace(new RegExp(`^${safe}\\b\\s*`, 'i'), '').trim()
    if (next !== normalized) {
      return next
    }
  }
  return normalized
}

const removeKnownTokens = (text, tokens = []) => {
  let output = text
  tokens
    .filter(Boolean)
    .forEach((token) => {
      const safe = sanitize(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      output = output.replace(new RegExp(`\\b${safe}\\b`, 'gi'), ' ')
    })
  return output.replace(/\s+/g, ' ').trim()
}

const detectLanguage = (text = '') => {
  const normalized = sanitize(text)
  const hasArabicScript = /[\u0600-\u06FF]/.test(text)
  const frenchSignals = ['demain', 'tache', 'ouvre', 'statistiques', 'termine', 'supprime']
  const darijaSignals = ['bda', 'ghdda', 'lyoum', 'mseh', 'kmmel', 'waqef', 'dial']
  const hasFrench = frenchSignals.some((token) => normalized.includes(token))
  const hasDarija = darijaSignals.some((token) => normalized.includes(token)) || hasArabicScript
  if ((hasFrench && hasDarija) || (hasArabicScript && hasFrench)) return 'mixed'
  if (hasDarija) return 'ar'
  if (hasFrench) return 'fr'
  return 'en'
}

const clampDuration = (value) => {
  if (!Number.isFinite(value)) return null
  return Math.max(RANGE_LIMITS.min, Math.min(RANGE_LIMITS.max, value))
}

const extractDuration = (text = '') => {
  const normalized = sanitize(text)

  const hourMinuteMatch = normalized.match(
    /\b(\d{1,3})\s*(?:h|hr|hrs|hour|hours)\s*(?:and\s*)?(\d{1,2})?\s*(?:m|min|mn|minute|minutes)?\b/
  )
  if (hourMinuteMatch) {
    const hours = Number(hourMinuteMatch[1]) || 0
    const minutes = Number(hourMinuteMatch[2]) || 0
    return clampDuration(hours * 60 + minutes)
  }

  const hourOnlyMatch = normalized.match(/\b(\d{1,3})\s*(?:h|hr|hrs|hour|hours)\b/)
  if (hourOnlyMatch) {
    return clampDuration(Number(hourOnlyMatch[1]) * 60)
  }

  const minuteOnlyMatch = normalized.match(
    /\b(\d{1,3})\s*(?:minutes|minute|min|mn|m|dakika|dqiqa|minutee)\b/
  )
  if (minuteOnlyMatch) {
    return clampDuration(Number(minuteOnlyMatch[1]))
  }

  const digitMatch = normalized.match(/(\d{1,3})\s*(?:minutes|minute|min|mn|dakika)?/)
  if (digitMatch) {
    return clampDuration(Number(digitMatch[1]))
  }

  const durationWords = {
    'twenty five': 25,
    'twenty-five': 25,
    'vingt cinq': 25,
    'thirty': 30,
    'trente': 30,
    'forty five': 45,
    'forty-five': 45,
    'quarante cinq': 45,
    'sixty': 60,
    'soixante': 60
  }

  const found = Object.entries(durationWords).find(([key]) => normalized.includes(key))
  return found ? clampDuration(found[1]) : null
}

const extractSubject = (text = '') => {
  const normalized = sanitize(text)
  for (const [subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(sanitize(alias)))) {
      return subject
    }
  }
  return ''
}

const extractDifficulty = (text = '') => {
  const normalized = sanitize(text)
  const hardSignals = ['hard', 'difficile', 'difficulte', 'difficulty', 's3ib', 'sa3b', 'challenging']
  const easySignals = ['easy', 'facile', 'sahl', 'simple']
  if (hardSignals.some((token) => normalized.includes(token))) return 'hard'
  if (easySignals.some((token) => normalized.includes(token))) return 'easy'
  return 'medium'
}

const extractDate = (text = '') => {
  const normalized = sanitize(text)
  const today = new Date()
  const nextDay = (days) => {
    const target = new Date(today)
    target.setDate(target.getDate() + days)
    return toDateKey(target)
  }

  if (hasAnyPhrase(normalized, DATE_ALIASES.tomorrow)) return nextDay(1)
  if (hasAnyPhrase(normalized, DATE_ALIASES.today)) return toDateKey(today)
  if (hasAnyPhrase(normalized, DATE_ALIASES.nextWeek)) return nextDay(7)
  return null
}

const extractRoute = (text = '') => {
  const normalized = sanitize(text)
  const destination = stripLeadingPhrase(normalized, NAVIGATION_PREFIXES)
  const routeEntry = Object.entries(ROUTE_ALIASES).find(([key]) => destination.includes(key))
  return routeEntry?.[1] || null
}

const scoreTaskMatch = (task, query) => {
  const q = sanitize(query)
  if (!q) return 0

  const title = sanitize(task?.title || '')
  const subject = sanitize(task?.subject || '')
  const words = q.split(' ').filter(Boolean)

  let score = 0
  if (title.includes(q)) score += 120
  if (subject.includes(q)) score += 85

  words.forEach((word) => {
    if (title.includes(word)) score += 22
    if (subject.includes(word)) score += 12
  })

  if (task?.completed || task?.status === 'completed') score -= 120
  if (task?.status === 'on_hold') score -= 50
  return score
}

const findMatchingTask = (tasks = [], query = '') => {
  const scored = tasks
    .map((task) => ({ task, score: scoreTaskMatch(task, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.task || null
}

const toTitleCase = (value = '') =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const parseCreateTask = (transcript) => {
  const normalized = sanitize(transcript)
  const subject = extractSubject(normalized)
  const dueDate = extractDate(normalized)
  const commandless = stripLeadingPhrase(normalized, CREATE_TASK_PREFIXES)

  const aliasesToRemove = subject ? SUBJECT_ALIASES[subject] : []
  const cleaned = removeKnownTokens(commandless, [
    ...aliasesToRemove,
    ...DATE_ALIASES.today,
    ...DATE_ALIASES.tomorrow,
    ...DATE_ALIASES.nextWeek,
    ...FILLER_WORDS
  ])

  const title = cleaned || (subject ? `${subject} task` : 'new task')
  return {
    type: 'create_task',
    language: detectLanguage(transcript),
    data: {
      title: toTitleCase(title),
      subject: subject || 'math',
      dueDate
    }
  }
}

const parseTargetedTaskIntent = (transcript, type) => {
  const normalized = sanitize(transcript)
  const prefixes =
    type === 'hold_task'
      ? HOLD_PREFIXES
      : type === 'delete_task'
        ? DELETE_PREFIXES
        : COMPLETE_PREFIXES

  const stripped = removeKnownTokens(stripLeadingPhrase(normalized, prefixes), [
    ...prefixes,
    ...FILLER_WORDS
  ])

  return {
    type,
    language: detectLanguage(transcript),
    data: {
      query: stripped
    }
  }
}

const EXAM_DURATION_HINTS = ['hour', 'hours', 'h', 'hr', 'hrs', 'minute', 'minutes', 'min', 'mn']

const parseExamIntent = (transcript) => {
  const normalized = sanitize(transcript)
  const duration = extractDuration(normalized)
  const subject = extractSubject(normalized)
  const difficulty = extractDifficulty(normalized)
  const stripped = removeKnownTokens(stripLeadingPhrase(normalized, EXAM_PATTERNS), [
    ...EXAM_PATTERNS,
    ...FILLER_WORDS,
    ...POMODORO_PATTERNS,
    'exam',
    'examen',
    'simulation',
    'mode',
    'question',
    'questions',
    'pressure',
    'strict',
    'timed',
    'timer',
    ...EXAM_DURATION_HINTS
  ])

  return {
    type: 'start_exam',
    language: detectLanguage(transcript),
    data: {
      query: stripped,
      subject,
      duration: duration || null,
      difficulty
    }
  }
}

const parseFocusIntent = (transcript) => {
  const normalized = sanitize(transcript)
  const duration = extractDuration(normalized)
  const subject = extractSubject(normalized)

  if (hasAnyPhrase(normalized, START_RECOMMENDED_PATTERNS)) {
    return {
      type: 'start_recommended_task',
      language: detectLanguage(transcript),
      data: {
        duration
      }
    }
  }

  if (hasAnyPhrase(normalized, FREE_FOCUS_PATTERNS)) {
    return {
      type: 'start_free_focus',
      language: detectLanguage(transcript),
      data: {}
    }
  }

  const stripped = removeKnownTokens(stripLeadingPhrase(normalized, START_PREFIXES), [
    ...START_PREFIXES,
    ...POMODORO_PATTERNS,
    'focus',
    'session',
    'study',
    'minute',
    'minutes',
    'min',
    'mn',
    'dial',
    'de',
    'for'
  ])

  if (hasAnyPhrase(normalized, POMODORO_PATTERNS) || duration) {
    return {
      type: 'start_pomodoro',
      language: detectLanguage(transcript),
      data: {
        query: stripped,
        subject,
        duration: duration || 45
      }
    }
  }

  return {
    type: 'start_focus',
    language: detectLanguage(transcript),
    data: {
      query: stripped,
      subject
    }
  }
}

const parseAutopilotIntent = (transcript) => {
  const normalized = sanitize(transcript)
  const duration = extractDuration(normalized)
  const subject = extractSubject(normalized)
  const stripped = removeKnownTokens(stripLeadingPhrase(normalized, AUTOPILOT_PATTERNS), [
    ...AUTOPILOT_PATTERNS,
    ...FILLER_WORDS,
    ...POMODORO_PATTERNS,
    'focus',
    'session',
    'study',
    'minute',
    'minutes',
    'min',
    'mn',
    'for',
    'dial'
  ])

  return {
    type: 'start_autopilot',
    language: detectLanguage(transcript),
    data: {
      query: stripped,
      subject,
      duration: duration || null
    }
  }
}

export const detectIntent = (transcript = '') => {
  const normalized = sanitize(transcript)
  if (!normalized) {
    return { type: 'unknown', data: {}, language: 'en', preview: null }
  }

  if (
    normalized.startsWith('task ') ||
    startsWithAnyPhrase(normalized, CREATE_TASK_PREFIXES)
  ) {
    const intent = parseCreateTask(normalized)
    return {
      ...intent,
      preview: {
        title: intent.data.title,
        subject: intent.data.subject,
        dueDate: intent.data.dueDate || 'No date'
      }
    }
  }

  if (hasAnyPhrase(normalized, CLEAR_OVERDUE_PATTERNS)) {
    return { type: 'clear_overdue', data: {}, language: detectLanguage(transcript) }
  }

  if (hasAnyPhrase(normalized, AUTOPILOT_PATTERNS)) {
    const intent = parseAutopilotIntent(normalized)
    return {
      ...intent,
      preview: {
        title: intent.data.subject || 'Autopilot',
        subject: intent.data.subject || 'focus',
        dueDate: intent.data.duration ? `${intent.data.duration} min` : 'Smart session'
      }
    }
  }

  if (hasAnyPhrase(normalized, EXAM_PATTERNS)) {
    const intent = parseExamIntent(normalized)
    return {
      ...intent,
      preview: {
        title: intent.data.subject ? `Exam ${intent.data.subject}` : 'Exam simulation',
        subject: intent.data.subject || 'auto',
        dueDate: intent.data.duration ? `${intent.data.duration} min` : 'Strict exam'
      }
    }
  }

  if (hasAnyPhrase(normalized, FINISH_PATTERNS)) {
    const saveRequested = normalized.includes('save') || normalized.includes('enregistre')
    return {
      type: saveRequested ? 'save_session' : 'finish_session',
      data: {},
      language: detectLanguage(transcript)
    }
  }

  if (hasAnyPhrase(normalized, DELETE_PREFIXES)) {
    return parseTargetedTaskIntent(normalized, 'delete_task')
  }

  if (hasAnyPhrase(normalized, HOLD_PREFIXES)) {
    return parseTargetedTaskIntent(normalized, 'hold_task')
  }

  if (hasAnyPhrase(normalized, COMPLETE_PREFIXES)) {
    return parseTargetedTaskIntent(normalized, 'complete_task')
  }

  if (hasAnyPhrase(normalized, PAUSE_PATTERNS)) {
    return { type: 'pause', data: {}, language: detectLanguage(transcript) }
  }

  if (hasAnyPhrase(normalized, RESUME_PATTERNS)) {
    return { type: 'resume', data: {}, language: detectLanguage(transcript) }
  }

  if (
    hasAnyPhrase(normalized, START_RECOMMENDED_PATTERNS) ||
    startsWithAnyPhrase(normalized, START_PREFIXES)
  ) {
    const intent = parseFocusIntent(normalized)
    return {
      ...intent,
      preview:
        intent.type === 'start_pomodoro'
          ? {
              title: `${intent.data.duration || 45} min pomodoro`,
              subject: intent.data.subject || 'focus',
              dueDate: intent.data.query || 'Focus session'
            }
          : intent.type === 'start_focus'
            ? {
                title: getShortMessage(intent.data.query || intent.data.subject || 'Focus task', 26),
                subject: intent.data.subject || 'focus',
                dueDate: 'Now'
              }
            : null
    }
  }

  if (startsWithAnyPhrase(normalized, NAVIGATION_PREFIXES)) {
    return {
      type: 'navigate',
      language: detectLanguage(transcript),
      data: {
        route: extractRoute(normalized) || '/dashboard'
      }
    }
  }

  return { type: 'unknown', data: {}, language: detectLanguage(transcript), preview: null }
}

const emitStudyControl = (payload) => {
  if (typeof window === 'undefined') return
  const detail = typeof payload === 'string' ? { action: payload } : payload
  window.dispatchEvent(
    new CustomEvent('assistant:study-control', {
      detail
    })
  )
}

const queuePendingStudyAction = (payload) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_STUDY_ACTION_KEY, JSON.stringify(payload))
}

const queuePendingExamAction = (payload) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_EXAM_ACTION_KEY, JSON.stringify(payload))
}

const updateStoredSession = (action, extra = {}) => {
  if (typeof window === 'undefined') return false
  const raw = window.localStorage.getItem('active_session')
  if (!raw) return false

  try {
    const parsed = JSON.parse(raw)
    const now = Date.now()

    if (action === 'pause' && parsed.isRunning) {
      const elapsedMs = Number(parsed.elapsedMs) || 0
      const startTime = Number(parsed.startTime) || now
      parsed.elapsedMs = elapsedMs + Math.max(0, now - startTime)
      parsed.isRunning = false
      parsed.startTime = null
      parsed.updatedAt = now
    }

    if ((action === 'resume' || action === 'start') && !parsed.isRunning) {
      parsed.isRunning = true
      parsed.startTime = now
      parsed.updatedAt = now
    }

    if (extra.mode) {
      parsed.mode = extra.mode
    }

    if (extra.duration) {
      parsed.pomodoroMinutes = extra.duration
      parsed.breakMinutes = Math.round(extra.duration / 3)
    }

    window.localStorage.setItem('active_session', JSON.stringify(parsed))
    return true
  } catch {
    return false
  }
}

const buildSuccess = (message, fullMessage, metadata = {}) => ({
  ok: true,
  status: 'success',
  message,
  fullMessage,
  metadata
})

const buildError = (message, fullMessage, metadata = {}) => ({
  ok: false,
  status: 'error',
  message,
  fullMessage,
  metadata
})

const buildConfirmation = (message, fullMessage, confirmIntent, metadata = {}) => ({
  ok: false,
  status: 'confirmation',
  message,
  fullMessage,
  requiresConfirmation: true,
  confirmIntent,
  metadata
})

const getRecommendedTask = (tasks = [], user) => {
  const activeTasks = tasks.filter(
    (task) => !task.completed && task.status !== 'completed' && task.status !== 'on_hold'
  )
  return getBestTask(activeTasks, user?.personalization || user)
}

const playTones = (tones = []) => {
  if (typeof window === 'undefined') return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return

  try {
    if (!audioContextRef || audioContextRef.state === 'closed') {
      audioContextRef = new AudioContextClass()
    }
    const ctx = audioContextRef
    const now = ctx.currentTime

    tones.forEach(([frequency, duration, offset, gain = 0.025]) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency, now + offset)
      gainNode.gain.setValueAtTime(0.0001, now + offset)
      gainNode.gain.exponentialRampToValueAtTime(gain, now + offset + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration)
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.start(now + offset)
      oscillator.stop(now + offset + duration + 0.02)
    })
  } catch {
    // Ignore audio failures.
  }
}

export const playAssistantSound = (kind = 'start') => {
  const soundMap = {
    listening: [
      [620, 0.08, 0],
      [760, 0.1, 0.08]
    ],
    processing: [[420, 0.12, 0]],
    executing: [
      [520, 0.08, 0],
      [640, 0.08, 0.08]
    ],
    success: [
      [640, 0.08, 0],
      [820, 0.12, 0.1]
    ],
    error: [
      [360, 0.08, 0],
      [220, 0.12, 0.08]
    ]
  }

  playTones(soundMap[kind] || soundMap.listening)
}

export const executeIntent = async (intent, deps = {}) => {
  const {
    user,
    tasks = [],
    addTask,
    updateTaskById,
    toggleTask,
    removeTask,
    navigate
  } = deps

  const bestTask = getRecommendedTask(tasks, user)

  const requireTaskMatch = (query = '') => {
    const task = findMatchingTask(tasks, query)
    if (!task) {
      return {
        error: buildError('Which task?', 'I could not match that task. Try saying the title more clearly.')
      }
    }
    return { task }
  }

  switch (intent.type) {
    case 'create_task': {
      const created = await addTask?.({
        title: intent.data.title,
        subject: intent.data.subject || 'math',
        due_date: intent.data.dueDate || null
      })

      return buildSuccess(
        'Task created',
        created?.title ? `Created "${created.title}".` : 'Created a new task.'
      )
    }

    case 'start_recommended_task': {
      if (!bestTask) {
        return buildError('No task found', 'There is no recommended task yet. Create one first.')
      }

      if (user?.id) {
        setActiveFocusTaskId(user.id, bestTask.id)
      }

      const payload = {
        action: 'start',
        mode: intent.data.duration ? 'pomodoro' : 'free',
        duration: intent.data.duration || null,
        taskId: bestTask.id
      }

      queuePendingStudyAction(payload)
      emitStudyControl(payload)
      navigate?.('/study', {
        state: { taskId: bestTask.id }
      })

      return buildSuccess(
        'Recommended started',
        `Starting focus for "${bestTask.title}".`
      )
    }

    case 'start_exam': {
      const plan = buildExamSimulationPlan(user, tasks, {
        studySessions: deps.studySessions || [],
        subject: intent.data.subject || 'auto',
        durationMinutes: intent.data.duration || null,
        difficulty: intent.data.difficulty || 'auto'
      })

      if (!plan) {
        return buildError('No exam plan', 'I could not build an exam simulation yet.')
      }

      const payload = {
        ...plan,
        action: 'start',
        autoStart: true
      }

      queuePendingExamAction(payload)
      navigate?.('/exam-simulation', {
        state: payload
      })

      return buildSuccess(
        'Exam simulation ready',
        `Starting a ${plan.durationMinutes}-minute ${plan.subjectLabel} exam simulation.`
      )
    }

    case 'start_autopilot': {
      const plan = buildAutopilotPlan({
        user,
        tasks,
        studySessions: deps.studySessions || []
      })

      if (!plan) {
        return buildError('No task found', 'I could not build an autopilot plan yet.')
      }

      const finalPlan = intent.data.duration ? { ...plan, duration: intent.data.duration } : plan

      if (user?.id && finalPlan.taskId) {
        setActiveFocusTaskId(user.id, finalPlan.taskId)
      }

      const payload = queueAutopilotLaunch({
        userId: user?.id,
        plan: finalPlan
      })

      emitStudyControl(payload)
      navigate?.('/study', {
        state: {
          ...payload,
          autopilot: true
        }
      })

      return buildSuccess(
        'Autopilot started',
        `Starting ${payload.duration || finalPlan.duration} minute autopilot focus.`
      )
    }

    case 'start_focus':
    case 'start_pomodoro': {
      const query = intent.data.query || intent.data.subject || ''
      const hasExplicitQuery = Boolean(query)
      const matchedTask = hasExplicitQuery ? findMatchingTask(tasks, query) : bestTask

      if (hasExplicitQuery && !matchedTask) {
        return buildError('Which task?', 'I could not match that task. Try saying the title more clearly.')
      }

      if (matchedTask?.id && user?.id) {
        setActiveFocusTaskId(user.id, matchedTask.id)
      }

      const payload = {
        action: 'start',
        mode: intent.type === 'start_pomodoro' ? 'pomodoro' : 'free',
        duration: intent.type === 'start_pomodoro' ? intent.data.duration || 45 : null,
        taskId: matchedTask?.id || null
      }

      queuePendingStudyAction(payload)
      emitStudyControl(payload)

      navigate?.('/study', {
        state: matchedTask?.id ? { taskId: matchedTask.id } : undefined
      })

      return buildSuccess(
        intent.type === 'start_pomodoro' ? 'Pomodoro started' : matchedTask ? 'Focus started' : 'Study opened',
        matchedTask
          ? `Starting ${payload.mode === 'pomodoro' ? `${payload.duration} min ` : ''}focus for "${matchedTask.title}".`
          : payload.mode === 'pomodoro'
            ? `Opening a ${payload.duration} minute pomodoro session.`
            : 'Opening study mode.'
      )
    }

    case 'start_free_focus': {
      const payload = { action: 'start', mode: 'free', taskId: null }
      queuePendingStudyAction(payload)
      emitStudyControl(payload)
      navigate?.('/study')

      return buildSuccess('Free focus', 'Opening a free focus session.')
    }

    case 'complete_task': {
      const { task, error } = requireTaskMatch(intent.data.query || '')
      if (error) return error

      if (task.completed || task.status === 'completed') {
        return buildSuccess('Already done', `"${task.title}" is already completed.`)
      }

      if (toggleTask) {
        await toggleTask(task.id, task.completed)
      } else {
        await updateTaskById?.(task.id, { completed: true, status: 'completed' })
      }

      return buildSuccess('Task completed', `Marked "${task.title}" as done.`)
    }

    case 'delete_task': {
      const { task, error } = requireTaskMatch(intent.data.query || '')
      if (error) return error

      if (!intent.confirmed) {
        return buildConfirmation(
          'Confirm delete',
          `Delete "${task.title}"? This cannot be undone.`,
          {
            ...intent,
            confirmed: true,
            data: { ...intent.data, query: task.title }
          }
        )
      }

      await removeTask?.(task.id)
      return buildSuccess('Task deleted', `Deleted "${task.title}".`)
    }

    case 'hold_task': {
      const { task, error } = requireTaskMatch(intent.data.query || '')
      if (error) return error

      await updateTaskById?.(task.id, {
        status: 'on_hold',
        completed: false
      })

      return buildSuccess('Task on hold', `"${task.title}" is now on hold.`)
    }

    case 'clear_overdue': {
      const overdueTasks = tasks.filter((task) => isOverdueTask(task))
      if (!overdueTasks.length) {
        return buildSuccess('No overdue tasks', 'There are no overdue tasks to clear.')
      }

      if (!intent.confirmed) {
        return buildConfirmation(
          'Confirm clear',
          `Delete ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}?`,
          {
            ...intent,
            confirmed: true
          },
          { count: overdueTasks.length }
        )
      }

      await Promise.all(overdueTasks.map((task) => removeTask?.(task.id)))
      return buildSuccess(
        'Overdue cleared',
        `Deleted ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}.`
      )
    }

    case 'pause': {
      const updated = updateStoredSession('pause')
      emitStudyControl({ action: 'pause' })
      return updated
        ? buildSuccess('Timer paused', 'The active focus session was paused.')
        : buildError('No running timer', 'No running session found. Open Study to start one.')
    }

    case 'resume': {
      const updated = updateStoredSession('resume')
      emitStudyControl({ action: 'resume' })
      if (!updated) {
        queuePendingStudyAction({ action: 'resume' })
        navigate?.('/study')
      }

      return buildSuccess(
        updated ? 'Focus resumed' : 'Open study',
        updated
          ? 'The paused focus session is running again.'
          : 'Opening Study so you can resume or start a session.'
      )
    }

    case 'finish_session': {
      emitStudyControl({ action: 'finish' })
      navigate?.('/study')
      return buildSuccess('Ending session', 'Opening Study to finish the current session.')
    }

    case 'save_session': {
      emitStudyControl({ action: 'save' })
      navigate?.('/study')
      return buildSuccess('Saving session', 'Opening Study to save the current session.')
    }

    case 'navigate': {
      navigate?.(intent.data.route || '/dashboard')
      return buildSuccess('Opening page', `Navigating to ${intent.data.route || '/dashboard'}.`)
    }

    default:
      return buildError(
        'Command unclear',
        'Try create task, start focus, start pomodoro, mark done, clear overdue, or go to tasks.'
      )
  }
}

export const processVoiceCommand = async (transcript, deps = {}) => {
  const intent = detectIntent(transcript)
  await delay(120)
  const result = await executeIntent(intent, deps)
  return { intent, result }
}

export const createVoiceSession = ({
  onTranscript,
  onFinalTranscript,
  onListeningChange,
  onError
} = {}) => {
  const SpeechRecognition = getSpeechRecognitionConstructor()
  if (!SpeechRecognition) {
    return {
      supported: false,
      startListening: () => false,
      stopListening: () => {}
    }
  }

  const recognition = new SpeechRecognition()
  recognition.lang =
    (typeof navigator !== 'undefined' &&
      (navigator.languages?.[0] || navigator.language)) ||
    'en-US'
  recognition.interimResults = true
  recognition.maxAlternatives = 1
  recognition.continuous = false

  let manualStop = false
  let continuousMode = false
  let isCoolingDown = false
  let silenceMs = 1800
  let finalTranscriptBuffer = ''
  let liveTranscriptBuffer = ''
  let finalizationTimer = null

  const clearFinalizationTimer = () => {
    if (finalizationTimer) {
      window.clearTimeout(finalizationTimer)
      finalizationTimer = null
    }
  }

  const flushFinalTranscript = () => {
    const finalText = finalTranscriptBuffer.trim()
    clearFinalizationTimer()
    finalTranscriptBuffer = ''
    liveTranscriptBuffer = ''
    if (finalText) {
      onFinalTranscript?.(finalText)
    }
  }

  const scheduleFinalization = () => {
    clearFinalizationTimer()
    finalizationTimer = window.setTimeout(() => {
      flushFinalTranscript()
    }, silenceMs)
  }

  recognition.onstart = () => {
    onListeningChange?.(true)
  }

  recognition.onresult = (event) => {
    let interim = ''
    let finalText = ''

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const transcript = result[0]?.transcript || ''
      if (result.isFinal) finalText += `${transcript} `
      else interim += `${transcript} `
    }

    if (finalText.trim()) {
      finalTranscriptBuffer = `${finalTranscriptBuffer} ${finalText}`.trim()
      liveTranscriptBuffer = finalTranscriptBuffer
      scheduleFinalization()
    }

    if (interim.trim()) {
      liveTranscriptBuffer = [finalTranscriptBuffer, interim.trim()].filter(Boolean).join(' ').trim()
      onTranscript?.(liveTranscriptBuffer)
      return
    }

    if (liveTranscriptBuffer.trim()) {
      onTranscript?.(liveTranscriptBuffer.trim())
    }
  }

  recognition.onerror = (event) => {
    clearFinalizationTimer()
    onListeningChange?.(false)
    onError?.(event?.error || 'Voice unavailable')
  }

  recognition.onend = () => {
    onListeningChange?.(false)
    if (!manualStop && continuousMode && !isCoolingDown) {
      isCoolingDown = true
      window.setTimeout(() => {
        isCoolingDown = false
        try {
          recognition.start()
        } catch {
          // Ignore restart collisions.
        }
      }, 260)
    }
  }

  return {
    supported: true,
    startListening: ({ continuous = true, silenceMs: nextSilenceMs = 1800 } = {}) => {
      continuousMode = continuous
      manualStop = false
      silenceMs = Math.max(900, Number(nextSilenceMs) || 1800)
      finalTranscriptBuffer = ''
      liveTranscriptBuffer = ''
      clearFinalizationTimer()
      recognition.continuous = continuous
      try {
        recognition.start()
        return true
      } catch {
        return false
      }
    },
    stopListening: () => {
      manualStop = true
      continuousMode = false
      clearFinalizationTimer()
      recognition.stop()
    }
  }
}

export const startVoiceListening = (session, options = {}) =>
  session?.startListening?.(options) || false

export const stopVoiceListening = (session) => {
  session?.stopListening?.()
}

export const buildAssistantPreview = (transcript = '') => {
  const intent = detectIntent(transcript)
  if (intent.preview) {
    return {
      title: getShortMessage(intent.preview.title || 'Assistant', 26),
      subject: intent.preview.subject || 'focus',
      dueDate: intent.preview.dueDate || 'No date'
    }
  }

  switch (intent.type) {
    case 'start_recommended_task':
      return {
        title: 'Recommended task',
        subject: 'AI choice',
        dueDate: 'Start now'
      }
    case 'clear_overdue':
      return {
        title: 'Clear overdue',
        subject: 'Risky action',
        dueDate: 'Needs confirmation'
      }
    case 'delete_task':
      return {
        title: getShortMessage(intent.data.query || 'Delete task', 26),
        subject: 'Risky action',
        dueDate: 'Needs confirmation'
      }
    default:
      return null
  }
}
