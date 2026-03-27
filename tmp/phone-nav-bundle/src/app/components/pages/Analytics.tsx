import { motion } from "motion/react";
import { TrendingUp, Calendar, Award, Target } from "lucide-react";

export function Analytics() {
  const weekData = [
    { day: "Mon", value: 80 },
    { day: "Tue", value: 65 },
    { day: "Wed", value: 90 },
    { day: "Thu", value: 75 },
    { day: "Fri", value: 100 },
    { day: "Sat", value: 45 },
    { day: "Sun", value: 70 },
  ];

  const maxValue = Math.max(...weekData.map((d) => d.value));

  const insights = [
    {
      icon: TrendingUp,
      label: "Avg. Daily XP",
      value: "75",
      trend: "+12%",
      color: "text-green-400",
    },
    {
      icon: Calendar,
      label: "Study Days",
      value: "6/7",
      trend: "This week",
      color: "text-blue-400",
    },
    {
      icon: Award,
      label: "Achievements",
      value: "12",
      trend: "+3 new",
      color: "text-purple-400",
    },
    {
      icon: Target,
      label: "Goals Hit",
      value: "85%",
      trend: "Success rate",
      color: "text-orange-400",
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
            Analytics
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            Track your progress
          </motion.p>
        </div>

        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 p-6 rounded-3xl"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h3 className="mb-6 text-white/80">This Week</h3>
          <div className="flex items-end justify-between gap-3 h-40">
            {weekData.map((data, index) => (
              <div key={data.day} className="flex flex-col items-center gap-3 flex-1">
                <div className="relative w-full">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.value / maxValue) * 100}%` }}
                    transition={{ delay: 0.3 + index * 0.05, duration: 0.5, ease: "easeOut" }}
                    className="w-full rounded-full bg-gradient-to-t from-purple-500 to-blue-500 min-h-[20px]"
                    style={{
                      opacity: data.value / maxValue * 0.5 + 0.5,
                    }}
                  />
                </div>
                <span className="text-xs text-white/50">{data.day}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Insights Grid */}
        <div className="grid grid-cols-2 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <motion.div
                key={insight.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + 0.1 * index, duration: 0.3 }}
                className="p-5 rounded-3xl"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <Icon className={`w-5 h-5 mb-3 ${insight.color}`} />
                <div className="text-2xl mb-1">{insight.value}</div>
                <div className="text-xs text-white/50 mb-1">{insight.label}</div>
                <div className="text-xs text-white/40">{insight.trend}</div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}