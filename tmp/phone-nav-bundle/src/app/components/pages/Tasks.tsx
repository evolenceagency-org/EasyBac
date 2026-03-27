import { motion } from "motion/react";
import { CheckCircle2, Circle, Flag } from "lucide-react";
import { useState } from "react";

export function Tasks() {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: "Complete React lesson",
      completed: true,
      priority: "high",
    },
    {
      id: 2,
      title: "Practice 10 flashcards",
      completed: true,
      priority: "medium",
    },
    {
      id: 3,
      title: "Review yesterday's notes",
      completed: false,
      priority: "medium",
    },
    {
      id: 4,
      title: "Take quiz on Hooks",
      completed: false,
      priority: "high",
    },
    {
      id: 5,
      title: "Watch tutorial video",
      completed: false,
      priority: "low",
    },
  ]);

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const priorityColors = {
    high: "text-red-400",
    medium: "text-yellow-400",
    low: "text-blue-400",
  };

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
            Tasks
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            {tasks.filter((t) => !t.completed).length} tasks remaining
          </motion.p>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.3 }}
              onClick={() => toggleTask(task.id)}
              className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <motion.div
                animate={{
                  scale: task.completed ? [1, 1.2, 1] : 1,
                }}
                transition={{ duration: 0.3 }}
              >
                {task.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <Circle className="w-6 h-6 text-white/40" />
                )}
              </motion.div>

              <div className="flex-1">
                <motion.p
                  animate={{
                    opacity: task.completed ? 0.5 : 1,
                  }}
                  className={task.completed ? "line-through" : ""}
                >
                  {task.title}
                </motion.p>
              </div>

              <Flag
                className={`w-4 h-4 ${priorityColors[task.priority as keyof typeof priorityColors]}`}
              />
            </motion.div>
          ))}
        </div>

        {/* Add Task Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-6 w-full p-4 rounded-2xl text-center transition-colors"
          style={{
            background: "rgba(139, 92, 246, 0.1)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
          }}
        >
          + Add New Task
        </motion.button>
      </div>
    </motion.div>
  );
}