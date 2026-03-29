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
    .insert(
      {
        id: userId,
        email,
        onboarding_completed: false,
        personalized: false,
        plan: null,
        subscription_status: 'free',
        trial_start: null,
        trial_active: false,
        trial_ends_at: null,
        exam_date: null,
        payment_verified: false,
        personalization: null,
        assistant_memory: {}
      },
      { onConflict: 'id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return getProfile(userId)
  }
  return data
}
