import { isPersonalized } from './personalization.js'
import { isPremiumTrialActive } from './subscription.js'

export const PENDING_VERIFICATION_EMAIL_KEY = 'auth:pending-verification-email'
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

export const persistPendingVerificationEmail = (email) => {
  if (typeof window === 'undefined') return

  if (!email) {
    window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
    return
  }

  window.sessionStorage.setItem(
    PENDING_VERIFICATION_EMAIL_KEY,
    email.trim().toLowerCase()
  )
}

export const getPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || ''
}

export const clearPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
}

export const hasSelectedPlan = (profile) => Boolean(String(profile?.plan || '').trim())

export const hasCompletedOnboarding = (profile) => {
  if (!profile) return false
  if (profile.onboarding_completed === true) return true
  return isPersonalized(profile) && hasSelectedPlan(profile)
}

export const getAuthenticatedHomeRoute = ({ user, profile }) => {
  if (!user) return '/login'
  if (!isEmailVerified(user)) return '/verify'
  if (!profile || !isPersonalized(profile)) return '/onboarding'
  if (!hasSelectedPlan(profile)) return '/choose-plan'
  return '/dashboard'
}

export const ensureValidRoute = ({ user, profile, currentPath = '' }) => {
  if (!user) return '/login'

  if (!isEmailVerified(user)) {
    return currentPath === '/verify' ? null : '/verify'
  }

  if (!profile) return null

  const personalizationRoutes = new Set(['/onboarding', '/personalization'])
  const planRoutes = new Set(['/choose-plan', '/checkout', '/payment'])

  if (!isPersonalized(profile)) {
    return personalizationRoutes.has(currentPath) ? null : '/onboarding'
  }

  if (!hasSelectedPlan(profile)) {
    return planRoutes.has(currentPath) ? null : '/choose-plan'
  }

  if (isPremiumTrialActive(profile) && currentPath === '/payment-pending') {
    return null
  }

  return null
}
