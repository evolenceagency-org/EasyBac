import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Brain, ListChecks, Target, TriangleAlert, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { generateAIResponse } from '../services/aiService.js'
import {
  analyzeUserData,
  buildInsightPrompt,
  getTodayDateKey,
  mergeAIInsight
} from '../utils/aiInsights.js'

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', staggerChildren: 0.06 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
}

const readStorageInsight = (userId) => {
  if (!userId || typeof window === 'undefined') return null

  try {
    const raw = localStorage.getItem(`daily-ai-insight-${userId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

const writeStorageInsight = (userId, value) => {
  if (!userId || typeof window === 'undefined') return
  try {
    localStorage.setItem(`daily-ai-insight-${userId}`, JSON.stringify(value))
  } catch {
    // Ignore storage write errors to avoid blocking the dashboard.
  }
}

const normalizeProfileInsightDate = (value) => {
  if (!value) return ''
  const normalized = String(value)
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalized
}

const InsightList = ({ icon: Icon, title, items }) => (
  <motion.div
    variants={cardVariants}
    whileHover={{ scale: 1.02 }}
    className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-md transition duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
  >
    <div className="mb-3 flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    <ul className="space-y-2 text-sm text-white/85">
      {items.map((item) => (
        <li key={item} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
          {item}
        </li>
      ))}
    </ul>
  </motion.div>
)

const AIInsights = ({ studySessions = [], tasks = [], streak = { current: 0, longest: 0 } }) => {
  const { user, profile, saveDailyInsight } = useAuth()
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)

  const hasPersonalization = Boolean(
    profile?.personalization &&
      typeof profile.personalization === 'object' &&
      Object.keys(profile.personalization).length
  )

  const fallbackInsight = useMemo(
    () => analyzeUserData({ studySessions, tasks, streak, profile }),
    [studySessions, tasks, streak, profile]
  )

  useEffect(() => {
    let cancelled = false

    const loadInsight = async () => {
      if (!user?.id) {
        setInsight(fallbackInsight)
        return
      }

      const today = getTodayDateKey()
      const profileDate = normalizeProfileInsightDate(profile?.last_insight_date)
      const profileInsight = profile?.daily_insight

      if (profileDate === today && profileInsight) {
        setInsight(profileInsight)
        writeStorageInsight(user.id, { date: today, insight: profileInsight })
        return
      }

      const localCached = readStorageInsight(user.id)
      if (localCached?.date === today && localCached?.insight) {
        setInsight(localCached.insight)
        return
      }

      setLoading(true)

      const baseInsight = fallbackInsight
      let finalInsight = baseInsight

      const prompt = buildInsightPrompt({
        studySessions,
        tasks,
        streak,
        profile
      })

      const aiResponse = await generateAIResponse(prompt)
      finalInsight = mergeAIInsight(baseInsight, aiResponse)
      finalInsight = { ...finalInsight, generatedAt: today }

      if (cancelled) return

      setInsight(finalInsight)
      writeStorageInsight(user.id, { date: today, insight: finalInsight })

      try {
        await saveDailyInsight({ insightDate: today, insightPayload: finalInsight })
      } catch {
        // Keep local cached insight if profile columns are not available yet.
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadInsight().catch(() => {
      if (!cancelled) {
        setInsight(fallbackInsight)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    user?.id,
    profile,
    studySessions,
    tasks,
    streak,
    fallbackInsight,
    saveDailyInsight
  ])

  const activeInsight = insight || fallbackInsight

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-600/35 to-blue-900/35 p-4 shadow-[0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-xl md:p-8"
    >
      <div className="pointer-events-none absolute -top-20 left-8 hidden h-56 w-56 rounded-full bg-purple-500/20 blur-3xl md:block" />
      <div className="pointer-events-none absolute bottom-10 right-12 hidden h-64 w-64 rounded-full bg-blue-500/20 blur-3xl md:block" />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white md:text-3xl">Daily AI Insight</h2>
              <p className="mt-1 text-sm text-white/75">
                Your daily AI insight is updated once per day based on your activity.
              </p>
            </div>
          </div>

          {!hasPersonalization && (
            <Link
              to="/personalization"
              className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              Complete Personalization
            </Link>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
          {loading
            ? 'Analyzing today\'s data...'
            : `Generated for ${activeInsight.generatedAt || getTodayDateKey()} | ${activeInsight.headline}`}
        </div>

        <motion.div
          variants={containerVariants}
          className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <InsightList
            icon={TriangleAlert}
            title="Weakness Analysis"
            items={activeInsight.weaknessAnalysis || []}
          />
          <InsightList
            icon={Target}
            title="Priority Subjects"
            items={(activeInsight.prioritySubjects || []).map((item) => `Focus on ${item}`)}
          />
          <InsightList
            icon={ListChecks}
            title="Daily Action Plan"
            items={activeInsight.dailyActionPlan || []}
          />
          <InsightList
            icon={Wrench}
            title="Specific Corrections"
            items={activeInsight.specificCorrections || []}
          />
        </motion.div>
      </div>
    </motion.section>
  )
}

export default AIInsights
