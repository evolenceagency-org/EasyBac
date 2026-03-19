const TRIAL_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

export const isTrialExpired = (trialStart) => {
  if (!trialStart) return true
  const start = new Date(trialStart).getTime()
  if (Number.isNaN(start)) return true
  return Date.now() - start >= TRIAL_DAYS * DAY_MS
}

export const isSubscriptionActive = (profile) => {
  if (!profile) return false
  if (profile.payment_verified) return true
  return !isTrialExpired(profile.trial_start)
}

export const handleProtectedAction = async (action, profile, navigate) => {
  if (isSubscriptionActive(profile)) {
    const result = await action()
    return { allowed: true, result }
  }
  if (typeof window !== 'undefined') {
    window.alert('Your free trial is over. Please upgrade.')
  }
  if (navigate) {
    navigate('/payment')
  }
  return { allowed: false }
}

export const isAccessDeniedError = (error) => {
  const status = error?.status || error?.statusCode
  if (status === 401 || status === 403) return true
  if (error?.code === '42501') return true
  return false
}

export const getTrialDaysLeft = (profile) => {
  if (!profile || !profile.trial_start) return 0
  const start = new Date(profile.trial_start).getTime()
  if (Number.isNaN(start)) return 0
  const remaining = TRIAL_DAYS * DAY_MS - (Date.now() - start)
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}
