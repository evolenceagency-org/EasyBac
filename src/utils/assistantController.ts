import { toDateKey } from './dateUtils.js'
import { getBestTask, getShortMessage } from './aiEngine.ts'
import { setActiveFocusTaskId } from './focusTasks.js'

export const PENDING_STUDY_ACTION_KEY = 'assistant-pending-study-action'

const SUBJECT_ALIASES = {
  math: [
    'math',
    'maths',
    'mathematics',
    'mathematiques',
    'mathématique',
    'maths',
    'riyadiyat',
    'رياضيات'
  ],
  physics: ['physics', 'physic', 'physique', 'fizik', 'فيزياء'],
  philosophie: [
    'philosophy',
    'philosophie',
    'philo',
    'falsafa',
    'philosophie',
    'فلسفة'
  ],
  svt: ['svt', 'science', 'sciences', 'biology', 'bio', 'علوم', 'biologie'],
  english: ['english', 'anglais', 'anglish', 'انجليزية']
}

const ROUTE_ALIASES = {
  dashboard: '/dashboard',
  home: '/dashboard',
  accueil: '/dashboard',
  tasks: '/tasks',
  task: '/tasks',
  tache: '/tasks',
  taches: '/tasks',
  todo: '/tasks',
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
  personalization: '/personalization',
  personnalisation: '/personalization',
  profil: '/personalization'
}

const DATE_ALIASES = {
  today: ['today', 'aujourdhui', 'aujourd hui', 'lyoum', 'lyoum', 'اليوم'],
  tomorrow: ['tomorrow', 'demain', 'ghdda', 'ghada', 'ghdwa', 'غدا'],
  nextWeek: [
    'next week',
    'la semaine prochaine',
    'semaine prochaine',
    'simana jaya',
    'semana jaya',
    'الأسبوع الجاي'
  ]
}

const CREATE_TASK_PREFIXES = [
  'create task',
  'add task',
  'new task',
  'task',
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

const START_FOCUS_PREFIXES = [
  'start focus',
  'focus on',
  'focus',
  'study',
  'start session',
  'start study',
  'demarre focus',
  'demarre la session',
  'commence focus',
  'commence la session',
  'lance focus',
  'bda focus',
  'bda session',
  'focus 3la',
  'focus ala',
  'abda focus',
  'ابدأ تركيز'
]

const COMPLETE_TASK_PREFIXES = [
  'mark',
  'mark task',
  'complete',
  'finish',
  'finished',
  'marque',
  'termine',
  'complete la tache',
  'complete tache',
  'sali',
  'kmmel',
  'kamel',
  'كمل',
  'انهي'
]

const COMPLETE_TASK_MARKERS = [
  'done',
  'completed',
  'termine',
  'complete',
  'finished',
  'sali',
  'kmmel',
  'kamel'
]

const HOLD_TASK_PREFIXES = [
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

const PAUSE_COMMANDS = [
  'pause timer',
  'pause focus',
  'pause session',
  'pause le timer',
  'pause la session',
  'pause focus timer',
  'waqef timer',
  'waqef focus',
  'waqef session',
  'وقف التركيز'
]

const RESUME_COMMANDS = [
  'resume focus',
  'resume timer',
  'resume session',
  'reprends focus',
  'reprends le timer',
  'continue focus',
  'kmel focus',
  'kml focus',
  'resume',
  'كمل التركيز'
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
  'dyal',
  'de',
  'du',
  'task',
  'tache',
  'taches',
  'mouhima',
  'مهمة'
]

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

const extractSubject = (text) => {
  const normalized = sanitize(text)
  for (const [subject, aliases] of Object.entries(SUBJECT_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(sanitize(alias)))) {
      return subject
    }
  }
  return ''
}

const extractDate = (text) => {
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

const removeKnownTokens = (text, tokens = []) => {
  let output = text
  tokens.filter(Boolean).forEach((token) => {
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    output = output.replace(new RegExp(`\\b${safe}\\b`, 'gi'), ' ')
  })
  return output.replace(/\s+/g, ' ').trim()
}

const scoreTaskMatch = (task, query) => {
  const q = sanitize(query)
  if (!q) return 0

  const title = sanitize(task?.title || '')
  const subject = sanitize(task?.subject || '')
  const words = q.split(' ').filter(Boolean)

  let score = 0
  if (title.includes(q)) score += 120
  if (subject.includes(q)) score += 80

  words.forEach((word) => {
    if (title.includes(word)) score += 20
    if (subject.includes(word)) score += 10
  })

  if (task?.completed || task?.status === 'completed') score -= 100
  if (task?.status === 'on_hold') score -= 40

  return score
}

const findMatchingTask = (tasks = [], query = '') => {
  const scored = tasks
    .map((task) => ({ task, score: scoreTaskMatch(task, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.task || null
}

const parseCreateTask = (transcript) => {
  const normalized = sanitize(transcript)
  const subject = extractSubject(normalized)
  const dueDate = extractDate(normalized)
  const commandless = stripLeadingPhrase(normalized, CREATE_TASK_PREFIXES)

  const aliasesToRemove = subject ? SUBJECT_ALIASES[subject] : []
  const cleaned = removeKnownTokens(commandless, [
    ...(aliasesToRemove || []),
    ...DATE_ALIASES.today,
    ...DATE_ALIASES.tomorrow,
    ...DATE_ALIASES.nextWeek,
    ...FILLER_WORDS
  ])

  const title = cleaned || (subject ? `${subject} task` : 'New task')

  return {
    type: 'create_task',
    data: {
      title:
        title.charAt(0).toUpperCase() + title.slice(1),
      subject: subject || 'math',
      dueDate
    }
  }
}

const parseTargetedTaskIntent = (transcript, type) => {
  const normalized = sanitize(transcript)
  const prefixes = type === 'hold_task' ? HOLD_TASK_PREFIXES : COMPLETE_TASK_PREFIXES
  const stripped = removeKnownTokens(stripLeadingPhrase(normalized, prefixes), [
    ...(type === 'hold_task' ? HOLD_TASK_PREFIXES : COMPLETE_TASK_MARKERS),
    ...FILLER_WORDS
  ])

  return {
    type,
    data: {
      query: stripped
    }
  }
}

export const parseIntent = (transcript = '') => {
  const normalized = sanitize(transcript)
  if (!normalized) return { type: 'unknown', data: {}, preview: null }

  if (
    normalized.startsWith('task ') ||
    CREATE_TASK_PREFIXES.some((phrase) => normalized.startsWith(sanitize(phrase)))
  ) {
    const intent = parseCreateTask(normalized)
    return {
      ...intent,
      preview: {
        title: intent.data.title,
        subject: intent.data.subject,
        dueDate: intent.data.dueDate
      }
    }
  }

  if (
    START_FOCUS_PREFIXES.some((phrase) => normalized.startsWith(sanitize(phrase))) ||
    hasAnyPhrase(normalized, ['study session', 'focus session'])
  ) {
    return {
      type: 'start_focus',
      data: {
        query: removeKnownTokens(stripLeadingPhrase(normalized, START_FOCUS_PREFIXES), [
          'session',
          'study',
          'focus',
          'la',
          'le'
        ]),
        subject: extractSubject(normalized)
      }
    }
  }

  if (
    COMPLETE_TASK_PREFIXES.some((phrase) => normalized.startsWith(sanitize(phrase))) ||
    COMPLETE_TASK_MARKERS.some((marker) => normalized.includes(sanitize(marker)))
  ) {
    return parseTargetedTaskIntent(normalized, 'complete_task')
  }

  if (hasAnyPhrase(normalized, HOLD_TASK_PREFIXES)) {
    return parseTargetedTaskIntent(normalized, 'hold_task')
  }

  if (hasAnyPhrase(normalized, PAUSE_COMMANDS)) {
    return { type: 'pause', data: {} }
  }

  if (hasAnyPhrase(normalized, RESUME_COMMANDS)) {
    return { type: 'resume', data: {} }
  }

  if (NAVIGATION_PREFIXES.some((phrase) => normalized.startsWith(sanitize(phrase)))) {
    const destination = stripLeadingPhrase(normalized, NAVIGATION_PREFIXES)

    const routeEntry = Object.entries(ROUTE_ALIASES).find(([key]) => destination.includes(key))
    return {
      type: 'navigate',
      data: {
        route: routeEntry?.[1] || '/dashboard'
      }
    }
  }

  return { type: 'unknown', data: {}, preview: null }
}

const emitStudyControl = (action) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('assistant:study-control', {
      detail: { action }
    })
  )
}

const queuePendingStudyAction = (payload) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_STUDY_ACTION_KEY, JSON.stringify(payload))
}

const updateStoredSession = (action) => {
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

    window.localStorage.setItem('active_session', JSON.stringify(parsed))
    return true
  } catch {
    return false
  }
}

export const executeAssistantIntent = async (intent, deps = {}) => {
  const {
    user,
    tasks = [],
    addTask,
    updateTaskById,
    toggleTask,
    navigate
  } = deps

  const bestTask = getBestTask(tasks, user?.personalization || user)

  switch (intent.type) {
    case 'create_task': {
      const created = await addTask?.({
        title: intent.data.title,
        subject: intent.data.subject || 'math',
        due_date: intent.data.dueDate || null
      })

      return {
        ok: true,
        message: 'Task created',
        fullMessage: created?.title
          ? `Created "${created.title}".`
          : 'Created a new task.'
      }
    }

    case 'start_focus': {
      const matchedTask =
        findMatchingTask(tasks, intent.data.query || intent.data.subject || '') || bestTask

      if (matchedTask?.id && user?.id) {
        setActiveFocusTaskId(user.id, matchedTask.id)
      }

      queuePendingStudyAction({
        action: 'start',
        taskId: matchedTask?.id || null
      })

      navigate?.('/study', {
        state: matchedTask?.id ? { taskId: matchedTask.id } : undefined
      })

      return {
        ok: true,
        message: matchedTask ? 'Focus started' : 'Open study',
        fullMessage: matchedTask
          ? `Starting focus for "${matchedTask.title}".`
          : 'Opening study mode.'
      }
    }

    case 'complete_task': {
      const task = findMatchingTask(tasks, intent.data.query || '')
      if (!task) {
        return {
          ok: false,
          message: 'Which task?',
          fullMessage: 'I could not match that task. Try saying the title more clearly.'
        }
      }

      if (task.completed || task.status === 'completed') {
        return {
          ok: true,
          message: 'Already done',
          fullMessage: `"${task.title}" is already completed.`
        }
      }

      if (toggleTask) {
        await toggleTask(task.id, task.completed)
      } else {
        await updateTaskById?.(task.id, { completed: true, status: 'completed' })
      }

      return {
        ok: true,
        message: 'Task completed',
        fullMessage: `Marked "${task.title}" as done.`
      }
    }

    case 'hold_task': {
      const task = findMatchingTask(tasks, intent.data.query || '')
      if (!task) {
        return {
          ok: false,
          message: 'Which task?',
          fullMessage: 'I could not find that task to put it on hold.'
        }
      }

      await updateTaskById?.(task.id, {
        status: 'on_hold',
        completed: false
      })

      return {
        ok: true,
        message: 'Task on hold',
        fullMessage: `"${task.title}" is now on hold and removed from AI priority.`
      }
    }

    case 'pause': {
      const updated = updateStoredSession('pause')
      emitStudyControl('pause')
      return {
        ok: updated,
        message: updated ? 'Timer paused' : 'Open study',
        fullMessage: updated
          ? 'The active focus session was paused.'
          : 'No running session found. Open Study to start one.'
      }
    }

    case 'resume': {
      const updated = updateStoredSession('resume')
      emitStudyControl('resume')
      if (!updated) {
        queuePendingStudyAction({ action: 'resume' })
        navigate?.('/study')
      }
      return {
        ok: true,
        message: updated ? 'Focus resumed' : 'Open study',
        fullMessage: updated
          ? 'The paused focus session is running again.'
          : 'Opening Study so you can resume or start a session.'
      }
    }

    case 'navigate': {
      navigate?.(intent.data.route || '/dashboard')
      return {
        ok: true,
        message: 'Opening page',
        fullMessage: `Navigating to ${intent.data.route || '/dashboard'}.`
      }
    }

    default:
      return {
        ok: false,
        message: 'Command unclear',
        fullMessage: 'Try create task, start focus, mark done, or go to tasks.'
      }
  }
}

export const processVoiceCommand = async (transcript, deps = {}) => {
  const intent = parseIntent(transcript)
  const result = await executeAssistantIntent(intent, deps)
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

    if (interim.trim()) onTranscript?.(interim.trim())
    if (finalText.trim()) onFinalTranscript?.(finalText.trim())
  }

  recognition.onerror = (event) => {
    onListeningChange?.(false)
    onError?.(event?.error || 'Voice unavailable')
  }

  recognition.onend = () => {
    onListeningChange?.(false)
    if (!manualStop && continuousMode) {
      try {
        recognition.start()
      } catch {
        // Ignore restart collisions.
      }
    }
  }

  return {
    supported: true,
    startListening: ({ continuous = false } = {}) => {
      continuousMode = continuous
      manualStop = false
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
      recognition.stop()
    }
  }
}

export const buildAssistantPreview = (transcript = '') => {
  const intent = parseIntent(transcript)
  if (!intent.preview) return null

  return {
    title: getShortMessage(intent.preview.title || 'New task', 26),
    subject: intent.preview.subject || 'math',
    dueDate: intent.preview.dueDate || 'No date'
  }
}
