import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive, normalizeSubscriptionStatus } from '../utils/subscription.js'
import { isPersonalized } from '../utils/personalization.js'

const ProtectedRoute = () => {
  const { user, session, loading, profile, profileLoading, initialized } = useAuth()
  const location = useLocation()
  const authUser = user || session?.user || null

  if (!initialized || loading) {
    return null
  }

  if (!authUser) {
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
    !isPersonalized(profile) &&
    location.pathname !== '/personalization'
  ) {
    return <Navigate to="/personalization" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
