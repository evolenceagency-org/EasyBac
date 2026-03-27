import { isPersonalized } from './personalization.js'
import { isSubscriptionActive, normalizeSubscriptionStatus } from './subscription.js'

export const PENDING_VERIFICATION_EMAIL_KEY = 'auth:pending-verification-email'
export const PENDING_REGISTRATION_KEY = 'auth:pending-registration'
export const EMAIL_OTP_LENGTH = 8
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
  window.sessionStorage.setItem(PENDING_VERIFICATION_EMAIL_KEY, email.trim().toLowerCase())
}

export const getPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return ''
  return window.sessionStorage.getItem(PENDING_VERIFICATION_EMAIL_KEY) || ''
}

export const clearPendingVerificationEmail = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_VERIFICATION_EMAIL_KEY)
}

export const persistPendingRegistration = (email, password) => {
  if (typeof window === 'undefined') return

  if (!email || !password) {
    window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY)
    return
  }

  window.sessionStorage.setItem(
    PENDING_REGISTRATION_KEY,
    JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      updatedAt: Date.now()
    })
  )
}

export const getPendingRegistrationPassword = (email) => {
  if (typeof window === 'undefined' || !email) return ''

  try {
    const raw = window.sessionStorage.getItem(PENDING_REGISTRATION_KEY)
    if (!raw) return ''

    const parsed = JSON.parse(raw)
    if (!parsed || parsed.email !== email.trim().toLowerCase()) return ''
    return parsed.password || ''
  } catch {
    return ''
  }
}

export const clearPendingRegistration = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(PENDING_REGISTRATION_KEY)
}

export const ensureValidRoute = ({ user, profile, currentPath = '' }) => {
  if (!user) return '/login'

  if (!isEmailVerified(user)) {
    return currentPath === '/verify-code' || currentPath === '/verify' ? null : '/verify-code'
  }

  if (!profile) return null

  const planStatus = normalizeSubscriptionStatus(profile.subscription_status)
  if (planStatus === 'free' && !profile.payment_verified) {
    return currentPath === '/choose-plan' ? null : '/choose-plan'
  }

  if (!isSubscriptionActive(profile)) {
    return currentPath === '/payment' ? null : '/payment'
  }

  if (!isPersonalized(profile)) {
    return currentPath === '/personalization' ? null : '/personalization'
  }

  return currentPath === '/dashboard' ? null : '/dashboard'
}
