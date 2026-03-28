const TRIAL_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000
const PREMIUM_TRIAL_MS = 48 * 60 * 60 * 1000

export const normalizeSubscriptionStatus = (status = '') => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'premium' || normalized === 'active') return 'premium'
  if (normalized === 'premium_trial') return 'premium_trial'
  if (normalized === 'trial' || normalized === 'free_trial') return 'trial'
  return 'free'
}

export const isTrialExpired = (trialStart) => {
  if (!trialStart) return true
  const start = new Date(trialStart).getTime()
  if (Number.isNaN(start)) return true
  return Date.now() - start >= TRIAL_DAYS * DAY_MS
}

export const isPremiumTrialActive = (profile) => {
  if (!profile?.trial_active) return false
  if (!profile?.trial_ends_at) return false
  const endsAt = new Date(profile.trial_ends_at).getTime()
  if (Number.isNaN(endsAt)) return false
  return endsAt > Date.now()
}

export const getPremiumTrialHoursLeft = (profile) => {
  if (!isPremiumTrialActive(profile)) return 0
  const endsAt = new Date(profile.trial_ends_at).getTime()
  const remaining = endsAt - Date.now()
  return Math.max(0, Math.ceil(remaining / (60 * 60 * 1000)))
}

export const hasPremiumAccess = (profile) => {
  if (!profile) return false
  const status = normalizeSubscriptionStatus(profile.subscription_status)
  return (
    status === 'premium' ||
    profile.payment_verified === true ||
    isPremiumTrialActive(profile)
  )
}

export const isSubscriptionActive = (profile) => {
  if (!profile) return false
  if (hasPremiumAccess(profile)) return true

  const status = normalizeSubscriptionStatus(profile.subscription_status)
  if (status === 'free') return false
  return !isTrialExpired(profile.trial_start)
}

export const isAccessDeniedError = (error) => {
  const status = error?.status || error?.statusCode
  if (status === 401 || status === 403) return true
  if (error?.code === '42501') return true
  return false
}

export const getTrialDaysLeft = (profile) => {
  if (!profile || !profile.trial_start) return 0
  const status = normalizeSubscriptionStatus(profile.subscription_status)
  if (status === 'free' || status === 'premium' || status === 'premium_trial') return 0
  const start = new Date(profile.trial_start).getTime()
  if (Number.isNaN(start)) return 0
  const remaining = TRIAL_DAYS * DAY_MS - (Date.now() - start)
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}

export const getPremiumTrialEndsAt = () =>
  new Date(Date.now() + PREMIUM_TRIAL_MS).toISOString()
