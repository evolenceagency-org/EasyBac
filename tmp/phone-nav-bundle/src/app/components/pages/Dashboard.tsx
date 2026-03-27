import { motion } from "motion/react";
import { TrendingUp, Award, Flame, Target } from "lucide-react";

export function Dashboard() {
  const stats = [
    { label: "Daily Streak", value: "12", icon: Flame, color: "text-orange-400" },
    { label: "XP Today", value: "240", icon: TrendingUp, color: "text-green-400" },
    { label: "Level", value: "8", icon: Award, color: "text-purple-400" },
    { label: "Goals", value: "3/5", icon: Target, color: "text-blue-400" },
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
            Home
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            Keep up the great work
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
                className="relative overflow-hidden rounded-3xl p-6"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="flex flex-col gap-3">
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                  <div>
                    <div className="text-2xl mb-1">{stat.value}</div>
                    <div className="text-sm text-white/50">{stat.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Daily Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl p-6"
          style={{
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))",
            border: "1px solid rgba(139, 92, 246, 0.2)",
          }}
        >
          <h3 className="mb-3">Daily Goal Progress</h3>
          <div className="mb-2">
            <div className="flex justify-between text-sm text-white/60 mb-2">
              <span>240 / 500 XP</span>
              <span>48%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "48%" }}
                transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
          <p className="text-sm text-white/60 mt-3">
            Complete 2 more lessons to reach your daily goal!
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}