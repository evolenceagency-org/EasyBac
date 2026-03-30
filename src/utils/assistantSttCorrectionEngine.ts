type Vocabulary = {
  actions: string[]
  subjects: string[]
  objects: string[]
  filler: string[]
}

type VariantGroups = Record<string, string[]>

type UserProfile = {
  commonWords: Record<string, number>
  frequentSubjects: Record<string, number>
  corrections: Record<string, string>
}

type MatchEntry = {
  canonical: string
  variant: string
}

type MatchResult = {
  value: string
  score: number
}

type TaskLike = {
  title?: string | null
  subject?: string | null
}

type GetBestMatchOptions = {
  profile?: UserProfile
  boostMap?: Record<string, number>
}

type CommandParts = {
  action: string
  subject?: string
  object?: string
  titleTokens: string[]
  duration: number | null
}

type CorrectionOptions = {
  userId?: string | null
  tasks?: TaskLike[]
  weakSubjects?: string[]
}

const PROFILE_PREFIX = 'assistant-stt-profile'
const MATCH_THRESHOLD = 0.7

const vocabulary: Vocabulary = {
  actions: ['start', 'pause', 'resume', 'stop', 'create', 'delete', 'complete', 'open', 'focus'],
  subjects: ['math', 'physics', 'svt', 'philosophy'],
  objects: ['task', 'session', 'study', 'focus', 'dashboard'],
  filler: ['bghit', 'n9ra', 'dir', 'ajoute']
}

const actionVariants: VariantGroups = {
  start: ['start', 'stat', 'stert', 'star', 'bda', 'bdi', 'abda', 'commence', 'demarre', 'launch', 'go'],
  pause: ['pause', 'pose', 'waqef', 'wkef'],
  resume: ['resume', 'continue', 'continuer', 'kml', 'kmel', 'kammel'],
  stop: ['stop', 'end', 'finish', 'finich', 'sali', 'safi'],
  create: ['create', 'add', 'ajoute', 'ajout', 'dir', 'sawb', 'new', 'make'],
  delete: ['delete', 'remove', 'erase', 'supprime', 'efface', 'mseh'],
  complete: ['complete', 'done', 'finish', 'mark', 'termine', 'kmmel'],
  open: ['open', 'show', 'ouvre', 'go', 'sir'],
  focus: ['focus', 'study', 'etudie', 'study']
}

const subjectVariants: VariantGroups = {
  math: ['math', 'maths', 'mat', 'match', 'mathe', 'mathematics', 'riyadiyat'],
  physics: ['physics', 'physic', 'physique', 'phy', 'fizik', 'fisik'],
  svt: ['svt', 'science', 'sciences', 'biology', 'bio'],
  philosophy: ['philosophy', 'philosophie', 'philo', 'falsafa']
}

const objectVariants: VariantGroups = {
  task: ['task', 'tasks', 'tache', 'taches', 'todo'],
  session: ['session', 'sessions', 'seance', 'seances'],
  study: ['study', 'etude', 'revision'],
  focus: ['focus'],
  dashboard: ['dashboard', 'home', 'accueil']
}

const fillerVariants: VariantGroups = {
  bghit: ['bghit', 'bgit', 'big', 'want', 'wanna'],
  n9ra: ['n9ra', 'nqra', 'nra', 'nora', 'read', 'learn'],
  dir: ['dir', 'do', 'make'],
  ajoute: ['ajoute', 'ajout', 'add']
}

const minuteVariants = ['min', 'mins', 'mn', 'men', 'minute', 'minutes'] as const
const ignoreWords = new Set(['ana', 'i', 'me', 'please', 'pls', 'the', 'a', 'an', 'le', 'la', 'l', 'de', 'des'])

const createEmptyUserProfile = (): UserProfile => ({
  commonWords: {},
  frequentSubjects: {},
  corrections: {}
})

const buildUserProfileKey = (userId?: string | null): string => `${PROFILE_PREFIX}:${userId || 'anonymous'}`

const readUserProfile = (userId?: string | null): UserProfile => {
  if (typeof window === 'undefined') {
    return createEmptyUserProfile()
  }

  try {
    const raw = window.localStorage.getItem(buildUserProfileKey(userId))
    const parsed = raw ? (JSON.parse(raw) as Partial<UserProfile> | null) : null
    return {
      commonWords: parsed?.commonWords && typeof parsed.commonWords === 'object' ? parsed.commonWords : {},
      frequentSubjects: parsed?.frequentSubjects && typeof parsed.frequentSubjects === 'object' ? parsed.frequentSubjects : {},
      corrections: parsed?.corrections && typeof parsed.corrections === 'object' ? parsed.corrections : {}
    }
  } catch {
    return createEmptyUserProfile()
  }
}

const writeUserProfile = (userId: string | null | undefined, profile: UserProfile): void => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(buildUserProfileKey(userId), JSON.stringify(profile))
  } catch {
    // Ignore storage errors.
  }
}

const normalizeToken = (value = ''): string =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()

const tokenize = (sentence = ''): string[] =>
  String(sentence || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token): token is string => Boolean(token))

const levenshtein = (left = '', right = ''): number => {
  const a = normalizeToken(left)
  const b = normalizeToken(right)
  if (!a) return b.length
  if (!b) return a.length

  const matrix: number[][] = Array.from({ length: a.length + 1 }, (_, index) => [index])
  for (let column = 0; column <= b.length; column += 1) {
    matrix[0][column] = column
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

const similarityScore = (left = '', right = ''): number => {
  const a = normalizeToken(left)
  const b = normalizeToken(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const distance = levenshtein(a, b)
  return 1 - distance / Math.max(a.length, b.length, 1)
}

const phoneticKey = (value = ''): string =>
  normalizeToken(value)
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'sh')
    .replace(/[qck]/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/ou/g, 'u')
    .replace(/ee|ea/g, 'i')
    .replace(/y/g, 'i')
    .replace(/[aeiou]/g, '')
    .replace(/(.)\1+/g, '$1')

const phoneticSimilarity = (left = '', right = ''): number => similarityScore(phoneticKey(left), phoneticKey(right))

const flattenVariants = (groups: VariantGroups = {}): MatchEntry[] =>
  Object.entries(groups).flatMap(([canonical, variants]) =>
    [canonical, ...(Array.isArray(variants) ? variants : [])].map((variant) => ({
      canonical,
      variant: normalizeToken(variant)
    }))
  )

const ACTION_ENTRIES = flattenVariants(actionVariants)
const SUBJECT_ENTRIES = flattenVariants(subjectVariants)
const OBJECT_ENTRIES = flattenVariants(objectVariants)
const FILLER_ENTRIES = flattenVariants(fillerVariants)

const buildTaskEntries = (tasks: TaskLike[] = []): MatchEntry[] =>
  tasks
    .map((task) => ({
      canonical: String(task?.title || '').trim(),
      variant: normalizeToken(task?.title || '')
    }))
    .filter((entry) => Boolean(entry.canonical && entry.variant))

const getBestMatch = (
  word: string,
  dictionary: Array<string | MatchEntry> = [],
  { profile, boostMap }: GetBestMatchOptions = {}
): MatchResult => {
  const normalized = normalizeToken(word)
  if (!normalized) return { value: String(word || ''), score: 0 }

  const learnedCorrection = profile?.corrections?.[normalized]
  if (learnedCorrection) {
    return { value: learnedCorrection, score: 1 }
  }

  let best: MatchResult = { value: normalized, score: 0 }

  dictionary.forEach((entry) => {
    const candidate: MatchEntry =
      typeof entry === 'string' ? { canonical: entry, variant: normalizeToken(entry) } : entry
    const exact = similarityScore(normalized, candidate.variant)
    const phonetic = phoneticSimilarity(normalized, candidate.variant) * 0.9
    const boost = Number(boostMap?.[candidate.canonical] || 0) || 0
    const score = Math.max(exact, phonetic) + boost

    if (score > best.score) {
      best = { value: candidate.canonical, score }
    }
  })

  if (best.score < MATCH_THRESHOLD) {
    return { value: normalized, score: best.score }
  }

  return best
}

const buildBoostMap = (profile: UserProfile = createEmptyUserProfile()): Record<string, number> => {
  const boostMap: Record<string, number> = {}

  Object.entries(profile.frequentSubjects || {}).forEach(([subject, count]) => {
    boostMap[subject] = Math.min(0.08, Number(count || 0) * 0.01)
  })

  return boostMap
}

const detectDuration = (tokens: string[] = []): number | null => {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!/^\d+$/.test(token)) continue

    const next = tokens[index + 1]
    if (!next || minuteVariants.includes(next as (typeof minuteVariants)[number]) || Number(token) <= 180) {
      return Math.max(5, Math.min(180, Number(token)))
    }
  }

  return null
}

const joinTokens = (tokens: Array<string | false | null | undefined> = []): string =>
  tokens.filter((token): token is string => Boolean(token)).join(' ').replace(/\s+/g, ' ').trim()

const rememberCorrections = (
  profile: UserProfile,
  rawTokens: string[] = [],
  correctedTokens: string[] = [],
  subject = ''
): void => {
  rawTokens.forEach((token, index) => {
    const raw = normalizeToken(token)
    const corrected = normalizeToken(correctedTokens[index] || raw)
    if (!raw) return

    profile.commonWords[raw] = (profile.commonWords[raw] || 0) + 1
    if (corrected && corrected !== raw) {
      profile.corrections[raw] = corrected
    }
  })

  if (subject) {
    profile.frequentSubjects[subject] = (profile.frequentSubjects[subject] || 0) + 1
  }
}

const buildCommandFromTokens = ({ action, subject, object, titleTokens, duration }: CommandParts): string => {
  if (action === 'start' || action === 'focus') {
    const parts = ['start', subject || object || 'session']
    if (duration) parts.push(`${duration} min`)
    return joinTokens(parts)
  }

  if (action === 'pause' || action === 'resume' || action === 'stop') {
    return joinTokens([action, object || 'session'])
  }

  if (action === 'open') {
    return joinTokens(['open', object || subject || 'dashboard'])
  }

  if (action === 'create') {
    return joinTokens(['create', 'task', ...titleTokens])
  }

  if (action === 'delete') {
    return joinTokens(['delete', object || 'task', ...titleTokens])
  }

  if (action === 'complete') {
    return joinTokens(['complete', object || 'task', ...titleTokens])
  }

  return joinTokens([action, subject, object, ...titleTokens, duration ? `${duration} min` : ''])
}

export const correctAssistantTranscript = (rawTranscript: string, { userId, tasks = [], weakSubjects = [] }: CorrectionOptions = {}): string => {
  const rawText = String(rawTranscript || '').trim()
  if (!rawText) return ''

  const rawTokens = tokenize(rawText)
  if (!rawTokens.length) return ''

  const profile = readUserProfile(userId)
  const boostMap = buildBoostMap(profile)
  const normalizedWeakSubjects = weakSubjects.map((subject) => normalizeToken(subject)).filter((subject) => Boolean(subject))
  const dynamicSubjectEntries: MatchEntry[] = [
    ...SUBJECT_ENTRIES,
    ...normalizedWeakSubjects.map((subject) => ({ canonical: subject, variant: subject }))
  ]

  const taskEntries = buildTaskEntries(tasks)

  const correctedTokens = rawTokens
    .map((token) => {
      if (/^\d+$/.test(token)) return token
      if (ignoreWords.has(token)) return ''
      if (minuteVariants.includes(token as (typeof minuteVariants)[number])) return 'min'

      const fillerMatch = getBestMatch(token, FILLER_ENTRIES, { profile })
      if (fillerMatch.score >= MATCH_THRESHOLD) return fillerMatch.value

      const actionMatch = getBestMatch(token, ACTION_ENTRIES, { profile })
      if (actionMatch.score >= MATCH_THRESHOLD) return actionMatch.value

      const subjectMatch = getBestMatch(token, dynamicSubjectEntries, { profile, boostMap })
      if (subjectMatch.score >= MATCH_THRESHOLD) return subjectMatch.value

      const objectMatch = getBestMatch(token, OBJECT_ENTRIES, { profile })
      if (objectMatch.score >= MATCH_THRESHOLD) return objectMatch.value

      const taskMatch = getBestMatch(token, taskEntries, { profile })
      if (taskMatch.score >= 0.82) return taskMatch.value

      return token
    })
    .filter((token): token is string => Boolean(token))

  const duration = detectDuration(correctedTokens)
  const hasStudyIntent = correctedTokens.includes('bghit') || correctedTokens.includes('n9ra')

  let action =
    correctedTokens.find((token) => vocabulary.actions.includes(token)) ||
    (hasStudyIntent ? 'start' : '')

  if (action === 'focus') action = 'start'
  if (!action && correctedTokens.includes('study')) action = 'start'

  const weakSubjectSet = new Set(normalizedWeakSubjects)
  const subject =
    correctedTokens.find((token) => vocabulary.subjects.includes(token)) ||
    correctedTokens.find((token) => weakSubjectSet.has(token)) ||
    ''

  let object = correctedTokens.find((token) => vocabulary.objects.includes(token)) || ''

  if ((action === 'pause' || action === 'resume' || action === 'stop') && !object) {
    object = 'session'
  }

  if (action === 'open' && !object) {
    object = 'dashboard'
  }

  const titleTokens = correctedTokens.filter((token) => {
    if (/^\d+$/.test(token) || token === 'min') return false
    if (token === action || token === subject || token === object) return false
    if (vocabulary.filler.includes(token)) return false
    return true
  })

  if (!action && subject) {
    action = 'start'
  }

  if (!action) {
    const fallback = joinTokens(correctedTokens)
    rememberCorrections(profile, rawTokens, correctedTokens, subject)
    writeUserProfile(userId, profile)
    return fallback
  }

  if (action === 'create' && !object) {
    object = 'task'
  }

  const command = buildCommandFromTokens({
    action,
    subject,
    object,
    titleTokens,
    duration
  })

  rememberCorrections(profile, rawTokens, tokenize(command), subject)
  writeUserProfile(userId, profile)
  return command || joinTokens(correctedTokens)
}
