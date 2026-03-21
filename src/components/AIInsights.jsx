import { motion } from 'framer-motion'
import { AlertCircle, TrendingUp, Flame, Clock, Brain } from 'lucide-react'

const defaultInsights = [
  'You are neglecting Physics. Add one session tomorrow.',
  'Your daily study time is below optimal. Aim for 2 hours.',
  'Your streak is strong. Keep going tomorrow.',
  'You complete few tasks per hour. Increase focus.'
]

const iconMap = [AlertCircle, Clock, Flame, TrendingUp, AlertCircle]

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut', staggerChildren: 0.08 }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
}

const AIInsights = ({ insights = defaultInsights }) => {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-purple-600/40 to-purple-900/40 p-6 shadow-[0_0_40px_rgba(139,92,246,0.25)] backdrop-blur-xl md:p-10"
    >
      <div className="pointer-events-none absolute -top-20 left-10 h-56 w-56 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-white/5" />

      <div className="relative">
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_20px_rgba(139,92,246,0.2)] backdrop-blur-xl md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
              <Brain className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Your AI Insights
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Personalized recommendations based on your study behavior
              </p>
            </div>
          </div>

          <motion.div
            variants={containerVariants}
            className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {insights.slice(0, 5).map((insight, index) => {
              const Icon = iconMap[index] || AlertCircle
              return (
                <motion.div
                  key={`${insight}-${index}`}
                  variants={cardVariants}
                  whileHover={{ scale: 1.05 }}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-md transition duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                >
                  <Icon className="mt-0.5 h-5 w-5 text-white" />
                  <p className="text-sm text-white/80">{insight}</p>
                </motion.div>
              )
            })}
          </motion.div>

        </div>
      </div>
    </motion.section>
  )
}

export default AIInsights
