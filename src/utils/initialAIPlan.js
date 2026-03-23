import { generateDailyInsight } from './aiEngine.ts'

export const generateInitialAIPlan = (answers = {}) => {
  return generateDailyInsight(
    {
      personalization: {
        level: answers.level,
        studyHours: answers.studyHours || answers.dailyStudyTime,
        goal: answers.goal || answers.mainGoal,
        weakSubjects:
          answers.hardSubjects ||
          answers.improveSubjects ||
          answers.weakSubjects ||
          (answers.weakestSubject ? [answers.weakestSubject] : []),
        focusIssues:
          answers.focusIssues ||
          answers.biggestProblem ||
          answers.mainIssue ||
          (answers.consistency === '1-3 days/week' ? ['Inconsistent'] : []),
        isPersonalized: true
      }
    },
    {
      tasks: [],
      studySessions: []
    }
  )
}
