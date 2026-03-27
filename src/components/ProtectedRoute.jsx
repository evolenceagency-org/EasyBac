import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ensureValidRoute } from '../utils/authFlow.js'

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

  if (profileLoading) {
    return null
  }

  const safeRoute = ensureValidRoute({
    user: authUser,
    profile,
    currentPath: location.pathname
  })

  if (safeRoute && safeRoute !== location.pathname) {
    return <Navigate to={safeRoute} replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
