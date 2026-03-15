import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { checkSubscription } from '../utils/subscription.js'

const ProtectedRoute = () => {
  const { user, loading, profile, profileError, profileLoading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        Loading...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-400">
        Verifying subscription...
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-red-400">
        {profileError}
      </div>
    )
  }

  const subscription = checkSubscription(profile)
  if (!subscription.allowed) {
    return <Navigate to="/payment" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
