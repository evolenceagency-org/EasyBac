const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const LEVEL_SCORE = {
  Good: 28,
  Average: 18,
  Struggling: 8
}

const STUDY_TIME_SCORE = {
  'Less than 2h': 10,
  '2-4h': 22,
  '4h+': 32
}

const CONSISTENCY_SCORE = {
  'Every day': 22,
  '4-5 days/week': 14,
  '1-3 days/week': 6
}

const GOAL_HOURS = {
  'Just pass': 2,
  'Good grade': 3,
  'Top score': 4
}

const normalizeInputs = (answers = {}) => {
  const weakSubjectsSource =
    answers.hardSubjects || answers.improveSubjects || answers.weakSubjects || []
  const weakSubjects = Array.isArray(weakSubjectsSource)
    ? weakSubjectsSource
    : typeof answers.weakestSubject === 'string' && answers.weakestSubject
      ? [answers.weakestSubject]
      : []

  return {
    level: answers.level || 'Average',
    dailyStudyTime: answers.studyHours || answers.dailyStudyTime || '2-4h',
    consistency: answers.consistency || '4-5 days/week',
    weakSubjects,
    mainGoal: answers.mainGoal || 'Good grade'
  }
}

const buildAnalysis = ({ level, dailyStudyTime, weakSubjects, consistency }) => {
  const subjectText =
    weakSubjects.length > 0 ? weakSubjects.join(', ') : 'no critical weak subjects'
  return `Level is ${level}. Study load is ${dailyStudyTime} with ${consistency} consistency. Current pressure points: ${subjectText}.`
}

const buildPlanItems = ({ mainGoal, weakSubjects, dailyStudyTime }) => {
  const prioritySubjects =
    weakSubjects.length > 0 ? weakSubjects.slice(0, 2) : ['Math', 'Physics']
  const dailyHours = Math.max(
    GOAL_HOURS[mainGoal] || 3,
    dailyStudyTime === 'Less than 2h' ? 3 : dailyStudyTime === '2-4h' ? 3 : 4
  )

  return [
    `Study ${dailyHours}h daily for the next 7 days.`,
    `Prioritize ${prioritySubjects.join(' and ')} in the first 90 minutes.`,
    'Use problem-solving blocks first, theory review second.',
    'Finish each session with a 10-minute error log and recap.'
  ]
}

export const generateInitialAIPlan = (answers = {}) => {
  const normalized = normalizeInputs(answers)
  const weakPenalty = Math.min(normalized.weakSubjects.length * 5, 15)

  const rawScore =
    LEVEL_SCORE[normalized.level] +
    STUDY_TIME_SCORE[normalized.dailyStudyTime] +
    CONSISTENCY_SCORE[normalized.consistency] -
    weakPenalty +
    20

  const score = clamp(Math.round(rawScore), 0, 100)

  return {
    score,
    analysis: buildAnalysis(normalized),
    plan: buildPlanItems(normalized),
    lastGenerated: new Date().toISOString().slice(0, 10),
    source: 'onboarding'
  }
}
