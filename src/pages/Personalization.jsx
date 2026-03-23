import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const levelOptions = ['Average', 'Good', 'Struggling']
const weakSubjectOptions = ['Math', 'Physics', 'Science', 'Languages', 'Philosophy', 'English']
const studyTimeOptions = ['Less than 2h', '2-4h', '4h+']
const goalOptions = ['Pass', 'Good grade', 'Top score']
const problemOptions = [
  'Lack of focus',
  'Procrastination',
  "Don't understand lessons",
  'Inconsistent'
]

const emptyForm = {
  level: '',
  weakSubjects: [],
  studyTime: '',
  goal: '',
  problem: ''
}

const Personalization = () => {
  const navigate = useNavigate()
  const { profile, updatePersonalization } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const saved = profile?.personalization
    if (!saved || typeof saved !== 'object') return

    setForm({
      level: saved.level || '',
      weakSubjects: Array.isArray(saved.weakSubjects) ? saved.weakSubjects : [],
      studyTime: saved.dailyStudyTime || '',
      goal: saved.mainGoal || '',
      problem: saved.biggestProblem || ''
    })
  }, [profile?.personalization])

  const isValid = useMemo(() => {
    return Boolean(form.level && form.studyTime && form.goal && form.problem)
  }, [form])

  const toggleWeakSubject = (subject) => {
    setError('')
    setSuccess('')
    setForm((prev) => {
      const exists = prev.weakSubjects.includes(subject)
      return {
        ...prev,
        weakSubjects: exists
          ? prev.weakSubjects.filter((item) => item !== subject)
          : [...prev.weakSubjects, subject]
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!isValid) {
      setError('Please complete all required fields before saving.')
      return
    }

    const personalization = {
      level: form.level,
      weakSubjects: form.weakSubjects,
      dailyStudyTime: form.studyTime,
      mainGoal: form.goal,
      biggestProblem: form.problem
    }

    try {
      setSaving(true)
      await updatePersonalization(personalization)
      setSuccess('Personalization saved. Your daily AI insight is now tailored to you.')
      setTimeout(() => {
        navigate('/dashboard')
      }, 600)
    } catch {
      setError('Unable to save your personalization right now. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_25px_rgba(139,92,246,0.12)] backdrop-blur-xl md:p-6"
      >
        <h1 className="text-xl font-semibold text-white md:text-2xl">Personalization</h1>
        <p className="mt-2 text-sm text-white/70">
          Help BacTracker generate strict daily insights using your study profile and activity.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div>
            <p className="text-sm font-medium text-white">Study level</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {levelOptions.map((option) => {
                const active = form.level === option
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setError('')
                      setSuccess('')
                      setForm((prev) => ({ ...prev, level: option }))
                    }}
                    className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                      active
                        ? 'border-purple-400/50 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Weak subjects</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {weakSubjectOptions.map((subject) => {
                const active = form.weakSubjects.includes(subject)
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => toggleWeakSubject(subject)}
                    className={`rounded-xl border px-4 py-2 text-sm transition-all ${
                      active
                        ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                    }`}
                  >
                    {subject}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="studyTime" className="text-sm font-medium text-white">
                Daily study time
              </label>
              <select
                id="studyTime"
                value={form.studyTime}
                onChange={(event) => {
                  setError('')
                  setSuccess('')
                  setForm((prev) => ({ ...prev, studyTime: event.target.value }))
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-400/40"
              >
                <option value="" className="bg-[#0d1020] text-white/70">Select</option>
                {studyTimeOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#0d1020] text-white">
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="goal" className="text-sm font-medium text-white">
                Main goal
              </label>
              <select
                id="goal"
                value={form.goal}
                onChange={(event) => {
                  setError('')
                  setSuccess('')
                  setForm((prev) => ({ ...prev, goal: event.target.value }))
                }}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-400/40"
              >
                <option value="" className="bg-[#0d1020] text-white/70">Select</option>
                {goalOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#0d1020] text-white">
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="problem" className="text-sm font-medium text-white">
              Biggest problem
            </label>
            <select
              id="problem"
              value={form.problem}
              onChange={(event) => {
                setError('')
                setSuccess('')
                setForm((prev) => ({ ...prev, problem: event.target.value }))
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-purple-400/40"
            >
              <option value="" className="bg-[#0d1020] text-white/70">Select</option>
              {problemOptions.map((option) => (
                <option key={option} value={option} className="bg-[#0d1020] text-white">
                  {option}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              {success}
            </div>
          )}

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(139,92,246,0.35)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Personalization'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              Back to Dashboard
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default Personalization
