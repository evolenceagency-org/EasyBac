import { toDateKey } from './dateUtils.js'

export const getTasksCompletedToday = (tasks = []) => {
  const todayKey = toDateKey(new Date())
  return tasks.filter(
    (task) => task.completed && toDateKey(task.created_at) === todayKey
  ).length
}

export const getTasksDueToday = (tasks = []) => {
  const todayKey = toDateKey(new Date())
  return tasks.filter((task) => task.due_date === todayKey)
}

export const isOverdueTask = (task) => {
  if (!task?.due_date || task.completed) return false
  const todayKey = toDateKey(new Date())
  return task.due_date < todayKey
}
