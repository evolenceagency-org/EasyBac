const hasValue = (value) => typeof value === 'string' && value.trim().length > 0

const hasArrayValue = (value) => Array.isArray(value) && value.length > 0

export const hasRequiredPersonalization = (personalization) => {
  if (!personalization || typeof personalization !== 'object') return false

  const level = hasValue(personalization.level)
  const studyHours = hasValue(personalization.studyHours || personalization.dailyStudyTime)
  const goal = hasValue(personalization.goal || personalization.mainGoal)
  const focusIssue =
    hasArrayValue(personalization.focusIssues) ||
    hasValue(personalization.biggestProblem) ||
    hasValue(personalization.mainIssue)

  return level && studyHours && goal && focusIssue
}

export const isPersonalized = (profile) => {
  if (profile?.personalized === true) return true

  const personalization = profile?.personalization
  if (!personalization || typeof personalization !== 'object') return false

  if (personalization.isPersonalized === true) return true
  return hasRequiredPersonalization(personalization)
}
