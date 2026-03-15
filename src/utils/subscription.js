const TRIAL_DAYS = 3

const getDaysSince = (value) => {
  if (!value) return TRIAL_DAYS
  const start = new Date(value)
  const now = new Date()
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export const checkSubscription = (profile) => {
  if (!profile) {
    return { allowed: false, status: 'missing', daysLeft: 0 }
  }

  if (profile.subscription_status === 'active') {
    return { allowed: true, status: 'active', daysLeft: 0 }
  }

  if (profile.subscription_status === 'trial') {
    const daysUsed = getDaysSince(profile.trial_start || profile.created_at)
    const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed)
    if (daysUsed < TRIAL_DAYS) {
      return { allowed: true, status: 'trial', daysLeft }
    }
    if (profile.payment_verified) {
      return { allowed: true, status: 'active', daysLeft: 0 }
    }
    return { allowed: false, status: 'expired', daysLeft: 0 }
  }

  if (profile.subscription_status === 'expired') {
    if (profile.payment_verified) {
      return { allowed: true, status: 'active', daysLeft: 0 }
    }
    return { allowed: false, status: 'expired', daysLeft: 0 }
  }

  return { allowed: false, status: 'expired', daysLeft: 0 }
}

export const getTrialDaysLeft = (profile) => {
  if (!profile || profile.subscription_status !== 'trial') return 0
  const daysUsed = getDaysSince(profile.trial_start || profile.created_at)
  return Math.max(0, TRIAL_DAYS - daysUsed)
}
