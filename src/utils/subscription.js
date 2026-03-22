const TRIAL_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export const normalizeSubscriptionStatus = (status = '') => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'premium' || normalized === 'active') return 'premium'
  if (normalized === 'trial' || normalized === 'free_trial') return 'trial'
  return 'free'
}

export const isTrialExpired = (trialStart) => {
  if (!trialStart) return true
  const start = new Date(trialStart).getTime()
  if (Number.isNaN(start)) return true
  return Date.now() - start >= TRIAL_DAYS * DAY_MS
}

export const isSubscriptionActive = (profile) => {
  if (!profile) return false
  const status = normalizeSubscriptionStatus(profile.subscription_status)
  if (status === 'premium') return true
  if (profile.payment_verified) return true
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
  if (status === 'free' || status === 'premium') return 0
  const start = new Date(profile.trial_start).getTime()
  if (Number.isNaN(start)) return 0
  const remaining = TRIAL_DAYS * DAY_MS - (Date.now() - start)
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}
