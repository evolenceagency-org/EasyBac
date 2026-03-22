import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive, normalizeSubscriptionStatus } from '../utils/subscription.js'

const isPersonalizationComplete = (profile) => {
  const personalization = profile?.personalization
  if (!personalization || typeof personalization !== 'object') return false

  const required = ['level', 'dailyStudyTime', 'mainGoal', 'biggestProblem']
  return required.every((key) => {
    const value = personalization[key]
    return typeof value === 'string' && value.trim().length > 0
  })
}

const ProtectedRoute = () => {
  const { user, loading, profile, profileLoading, initialized } = useAuth()
  const location = useLocation()

  if (!initialized || loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading || !profile) {
    return null
  }

  const planStatus = normalizeSubscriptionStatus(profile.subscription_status)
  if (planStatus === 'free' && !profile.payment_verified) {
    return <Navigate to="/choose-plan" replace />
  }

  if (!isSubscriptionActive(profile)) {
    return <Navigate to="/payment" replace />
  }

  if (
    !isPersonalizationComplete(profile) &&
    location.pathname !== '/personalization'
  ) {
    return <Navigate to="/personalization" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
