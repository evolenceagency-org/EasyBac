const REQUIRED_PERSONALIZATION_KEYS = [
  'level',
  'dailyStudyTime',
  'mainGoal',
  'biggestProblem'
]

export const hasRequiredPersonalization = (personalization) => {
  if (!personalization || typeof personalization !== 'object') return false

  return REQUIRED_PERSONALIZATION_KEYS.every((key) => {
    const value = personalization[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

export const isPersonalized = (profile) => {
  const personalization = profile?.personalization
  if (!personalization || typeof personalization !== 'object') return false

  if (personalization.isPersonalized === true) return true
  return hasRequiredPersonalization(personalization)
}
