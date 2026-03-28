import { isSubscriptionActive } from './subscription.js'

export const checkTrialAndBlock = (profile, navigate) => {
  if (isSubscriptionActive(profile)) {
    return true
  }

  if (typeof window !== 'undefined') {
    window.alert('Your free trial has ended. Upgrade to continue.')
  }

  if (navigate) {
    setTimeout(() => {
      navigate('/checkout')
    }, 300)
  }

  return false
}
