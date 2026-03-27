import { motion } from "motion/react";
import { BookOpen, Clock, Star, Play } from "lucide-react";

export function Study() {
  const lessons = [
    {
      title: "Introduction to React",
      duration: "15 min",
      progress: 75,
      stars: 3,
      color: "from-blue-500/20 to-cyan-500/20",
      borderColor: "rgba(59, 130, 246, 0.3)",
    },
    {
      title: "Advanced Hooks",
      duration: "20 min",
      progress: 40,
      stars: 2,
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "rgba(139, 92, 246, 0.3)",
    },
    {
      title: "State Management",
      duration: "25 min",
      progress: 0,
      stars: 0,
      color: "from-orange-500/20 to-red-500/20",
      borderColor: "rgba(249, 115, 22, 0.3)",
    },
    {
      title: "Performance Optimization",
      duration: "18 min",
      progress: 0,
      stars: 0,
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "rgba(34, 197, 94, 0.3)",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen"
    >
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl mb-2"
          >
            Study
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            Continue your learning journey
          </motion.p>
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {lessons.map((lesson, index) => (
            <motion.div
              key={lesson.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
              className="relative overflow-hidden rounded-3xl p-5"
              style={{
                background: `linear-gradient(135deg, ${lesson.color.split(" ")[0].split("/")[0]}/10, ${lesson.color.split(" ")[1].split("/")[0]}/10)`,
                border: `1px solid ${lesson.borderColor}`,
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="mb-2">{lesson.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {lesson.duration}
                    </span>
                    {lesson.stars > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {lesson.stars}/3
                      </span>
                    )}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
                >
                  {lesson.progress > 0 ? (
                    <Play className="w-5 h-5" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                </motion.button>
              </div>

              {lesson.progress > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-white/50 mb-2">
                    <span>Progress</span>
                    <span>{lesson.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${lesson.progress}%` }}
                      transition={{ delay: 0.2 + 0.1 * index, duration: 0.6 }}
                      className="h-full bg-gradient-to-r from-white/80 to-white/60 rounded-full"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}