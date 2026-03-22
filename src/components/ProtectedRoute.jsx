import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { isSubscriptionActive } from '../utils/subscription.js'

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

  if (!isSubscriptionActive(profile)) {
    return <Navigate to="/payment" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
