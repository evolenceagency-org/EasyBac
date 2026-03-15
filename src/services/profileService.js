import { supabase } from '../lib/supabaseClient.js'

const ensureUserId = (userId) => {
  if (!userId) {
    throw new Error('Missing user id for profile request.')
  }
}

export const getProfile = async (userId) => {
  ensureUserId(userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export const createProfile = async (userId, email) => {
  ensureUserId(userId)

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        subscription_status: 'trial',
        trial_start: new Date().toISOString(),
        payment_verified: false
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}
