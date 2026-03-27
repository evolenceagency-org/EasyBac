import { isPersonalized } from './personalization.js'
import { isSubscriptionActive, normalizeSubscriptionStatus } from './subscription.js'

export const PENDING_VERIFICATION_EMAIL_KEY = 'auth:pending-verification-email'
export const PENDING_VERIFICATION_FLOW_KEY = 'auth:pending-verification-flow'
export const EMAIL_OTP_LENGTH = 6
export const OTP_COOLDOWN_SECONDS = 30
export const OTP_MAX_ATTEMPTS = 5
export const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000

export const isEmailVerified = (user) =>
  Boolean(
    user?.email_confirmed_at ||
      user?.confirmed_at ||
      user?.user_metadata?.email_verified ||
      user?.app_metadata?.email_verified
  )

export const persistPendingVerificationEmail = (email, flow = 'signup') => {
  if (typeof window === 'undefined') return
  if (!email) {
    window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
    window.sessionStorage.removeItem(PENDING_VERIFICATION_FLOW_KEY)
    return
  }
  window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase())
  window.sessionStorage.setItem(PENDING_VERIFICATION_FLOW_KEY, flow)
}

export const getPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || ''
}

export const getPendingVerificationFlow = () => {
  if (typeof window === 'undefined') return 'signup'
  return window.sessionStorage.getItem(PENDING_VERIFICATION_FLOW_KEY) || 'signup'
}

export const clearPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
  window.sessionStorage.removeItem(PENDING_VERIFICATION_FLOW_KEY)
}

export const hasCompletedOnboarding = (profile) => {
  if (!profile) return false
  if (profile.onboarding_completed === true) return true

  const normalizedPlan = String(profile.plan || '').toLowerCase()
  return isPersonalized(profile) && (normalizedPlan === 'trial' || normalizedPlan === 'premium')
}

export const ensureValidRoute = ({ user, profile, currentPath = '' }) => {
  if (!user) return '/login'

  if (!isEmailVerified(user)) {
    return currentPath === '/verify-code' || currentPath === '/verify' ? null : '/verify'
  }

  if (!profile) return null

  if (!hasCompletedOnboarding(profile)) {
    return currentPath === '/onboarding' || currentPath === '/personalization' || currentPath === '/choose-plan'
      ? null
      : '/onboarding'
  }

  const planStatus = normalizeSubscriptionStatus(profile.subscription_status)
  if (!isSubscriptionActive(profile)) {
    return currentPath === '/payment' ? null : '/payment'
  }

  if (!isPersonalized(profile)) {
    return currentPath === '/personalization' ? null : '/personalization'
  }

  return currentPath === '/dashboard' ? null : '/dashboard'
}
