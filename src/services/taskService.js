import { supabase } from '../lib/supabaseClient.js'
import { shouldAllowRequest } from '../utils/requestLimiter.js'

let cachedTasks = null

const logDev = (message) => {
  if (import.meta.env.DEV) {
    console.log(message)
  }
}

const retryWithBackoff = async (fn, label) => {
  const delays = [1000, 2000, 4000]
  let attempt = 0

  while (attempt <= delays.length) {
    try {
      return await fn()
    } catch (error) {
      if (error?.status === 429 && attempt < delays.length) {
        const wait = delays[attempt]
        logDev(`Retrying ${label} after ${wait}ms due to 429...`)
        await new Promise((resolve) => setTimeout(resolve, wait))
        attempt += 1
        continue
      }
      throw error
    }
  }
}

const ensureUserId = (userId) => {
  if (!userId) {
    throw new Error('Missing user id for task request.')
  }
}

export const getTasks = async (userId, options = {}) => {
  ensureUserId(userId)
  if (!options.force && cachedTasks) {
    return cachedTasks
  }

  if (!shouldAllowRequest('tasks')) {
    logDev('Skipped tasks fetch due to request limiter.')
    return cachedTasks || []
  }

  logDev('Fetching tasks from Supabase')
  const data = await retryWithBackoff(async () => {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return tasks
  }, 'tasks')

  cachedTasks = data
  return data
}

export const createTask = async (userId, taskData) => {
  ensureUserId(userId)
  logDev('Creating task in Supabase')

  const payload = {
    user_id: userId,
    title: taskData.title,
    subject: taskData.subject,
    due_date: taskData.due_date || null,
    completed: false
  }

  const data = await retryWithBackoff(async () => {
    const { data: created, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return created
  }, 'tasks:create')

  if (cachedTasks) {
    cachedTasks = [data, ...cachedTasks]
  }

  return data
}

export const updateTask = async (userId, taskId, updates) => {
  ensureUserId(userId)
  logDev('Updating task in Supabase')

  const data = await retryWithBackoff(async () => {
    const { data: updated, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return updated
  }, 'tasks:update')

  if (cachedTasks) {
    cachedTasks = cachedTasks.map((task) =>
      task.id === data.id ? data : task
    )
  }

  return data
}

export const deleteTask = async (userId, taskId) => {
  ensureUserId(userId)
  logDev('Deleting task in Supabase')

  await retryWithBackoff(async () => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId)

    if (error) throw error
  }, 'tasks:delete')

  if (cachedTasks) {
    cachedTasks = cachedTasks.filter((task) => task.id !== taskId)
  }

  return true
}

export const toggleTaskCompletion = async (
  userId,
  taskId,
  currentCompleted
) => {
  ensureUserId(userId)
  logDev('Toggling task completion in Supabase')

  let completedValue = currentCompleted
  if (completedValue === undefined && cachedTasks) {
    const cached = cachedTasks.find((task) => task.id === taskId)
    completedValue = cached?.completed
  }

  if (completedValue === undefined) {
    const { data: current, error: fetchError } = await supabase
      .from('tasks')
      .select('completed')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError
    completedValue = current.completed
  }

  const data = await retryWithBackoff(async () => {
    const { data: updated, error } = await supabase
      .from('tasks')
      .update({ completed: !completedValue })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return updated
  }, 'tasks:toggle')

  if (cachedTasks) {
    cachedTasks = cachedTasks.map((task) =>
      task.id === data.id ? data : task
    )
  }

  return data
}

export const clearTaskCache = () => {
  cachedTasks = null
}

