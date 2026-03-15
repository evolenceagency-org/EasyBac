import { supabase } from '../lib/supabaseClient.js'
import { shouldAllowRequest } from '../utils/requestLimiter.js'

let cachedStudySessions = null

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
    throw new Error('Missing user id for study session request.')
  }
}

export const getStudySessions = async (userId, options = {}) => {
  ensureUserId(userId)
  if (!options.force && cachedStudySessions) {
    return cachedStudySessions
  }

  if (!shouldAllowRequest('study_sessions')) {
    logDev('Skipped study sessions fetch due to request limiter.')
    return cachedStudySessions || []
  }

  logDev('Fetching study sessions from Supabase')
  const data = await retryWithBackoff(async () => {
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (error) throw error
    return sessions
  }, 'study_sessions')

  cachedStudySessions = data
  return data
}

export const createStudySession = async (userId, sessionData) => {
  ensureUserId(userId)
  logDev('Creating study session in Supabase')

  const payload = {
    user_id: userId,
    date: sessionData.date,
    duration_minutes: sessionData.duration_minutes,
    mode: sessionData.mode || 'free'
  }

  const data = await retryWithBackoff(async () => {
    const { data: created, error } = await supabase
      .from('study_sessions')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return created
  }, 'study_sessions:create')

  if (cachedStudySessions) {
    cachedStudySessions = [data, ...cachedStudySessions]
  }

  return data
}

export const deleteStudySession = async (userId, sessionId) => {
  ensureUserId(userId)
  logDev('Deleting study session in Supabase')

  await retryWithBackoff(async () => {
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId)

    if (error) throw error
  }, 'study_sessions:delete')

  if (cachedStudySessions) {
    cachedStudySessions = cachedStudySessions.filter(
      (session) => session.id !== sessionId
    )
  }

  return true
}

export const clearStudySessionCache = () => {
  cachedStudySessions = null
}

