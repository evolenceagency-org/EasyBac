const STORAGE_PREFIX = 'easybac:ai-control-center'

const DEFAULT_SETTINGS = {
  voice: {
    enabled: true,
    permission: 'unknown',
    language: 'auto',
    alwaysListening: false,
    pushToTalkOnly: false
  },
  assistant: {
    visible: true,
    mode: 'smart',
    proactiveSuggestions: true,
    interruptDuringSessions: false
  },
  autopilot: {
    enabled: true,
    autonomyLevel: 'medium',
    autoStartSessions: true,
    autoExtendSessions: true,
    autoSwitchTasks: true,
    autoScheduleDay: false
  }
}

const isBrowser = typeof window !== 'undefined'

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

const deepMerge = (base, override) => {
  const result = Array.isArray(base) ? [...base] : { ...(base || {}) }
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && base && typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      result[key] = deepMerge(base[key], value)
      return
    }
    if (value !== undefined) {
      result[key] = value
    }
  })
  return result
}

export const normalizeAiControlCenterSettings = (value = {}) => deepMerge(DEFAULT_SETTINGS, value)

export const getAiControlCenterStorageKey = (userId = 'guest') =>
  `${STORAGE_PREFIX}:${userId || 'guest'}`

export const readAiControlCenterSettings = (userId) => {
  if (!isBrowser) return normalizeAiControlCenterSettings()
  const stored = readJson(getAiControlCenterStorageKey(userId), null)
  return normalizeAiControlCenterSettings(stored || {})
}

export const writeAiControlCenterSettings = (userId, settings) => {
  if (!isBrowser) return normalizeAiControlCenterSettings(settings)
  const next = normalizeAiControlCenterSettings(settings)
  writeJson(getAiControlCenterStorageKey(userId), next)
  return next
}

export const updateAiControlCenterSettings = (userId, updater) => {
  const current = readAiControlCenterSettings(userId)
  const next = typeof updater === 'function' ? updater(current) : updater
  return writeAiControlCenterSettings(userId, next)
}

export const getAutonomyLabel = (value) => {
  if (value === 'low') return 'Low'
  if (value === 'high') return 'High'
  return 'Medium'
}

export const getLanguageLabel = (value) => {
  if (value === 'ar') return 'Arabic'
  if (value === 'fr') return 'French'
  if (value === 'en') return 'English'
  return 'Auto'
}

export const getAssistantModeLabel = (value) => {
  if (value === 'suggest') return 'Suggest Mode'
  if (value === 'autopilot') return 'Autopilot Mode'
  return 'Smart Mode'
}

export { DEFAULT_SETTINGS as AI_CONTROL_CENTER_DEFAULTS }
