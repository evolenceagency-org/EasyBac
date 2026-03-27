import { EMAIL_OTP_LENGTH } from './authFlow.js'

export const validateEmail = (email) => {
  if (!email.trim()) return 'Email is required'
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!pattern.test(email.trim())) return 'Enter a valid email'
  return ''
}

export const validatePassword = (password) => {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return ''
}

export const getAuthErrorMessage = (error) => {
  const msg = error?.message || ''

  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email or password'
  }

  if (msg.includes('User not found')) {
    return 'No account found with this email'
  }

  if (msg.includes('Email not found')) {
    return 'No account found with this email'
  }

  if (
    msg.includes('User already registered') ||
    msg.includes('already registered') ||
    msg.includes('duplicate key') ||
    msg.includes('already exists')
  ) {
    return 'This email is already registered. Try logging in.'
  }

  if (msg.includes('Password should be')) {
    return 'Password must be at least 6 characters'
  }

  if (msg.includes('Email not confirmed')) {
    return 'Please verify your email before logging in'
  }

  if (msg.includes('Token has expired') || msg.includes('expired')) {
    return 'This code expired. Request a new one.'
  }

  if (msg.includes('Token is invalid') || msg.includes('invalid token')) {
    return `Invalid code. Please check the ${EMAIL_OTP_LENGTH}-digit code and try again.`
  }

  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }

  return 'Something went wrong. Please try again'
}

export const getPasswordStrength = (password) => {
  if (!password) return { label: 'Use at least 6 characters', tone: 'text-white/50' }
  if (password.length < 6) return { label: 'Too short', tone: 'text-red-300' }
  if (password.length < 10) return { label: 'Good start', tone: 'text-amber-300' }
  return { label: 'Strong password', tone: 'text-emerald-300' }
}
