import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MainLayout from './layout/MainLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Payment from './pages/Payment.jsx'
import Landing from './pages/Landing.jsx'
import Contact from './pages/Contact.jsx'
import Pricing from './pages/Pricing.jsx'
import DonatePage from './pages/DonatePage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'
import useAppAnalytics from './hooks/useAppAnalytics.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Study = lazy(() => import('./pages/Study.jsx'))
const Tasks = lazy(() => import('./pages/Tasks.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))

const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-black text-white">
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-3 w-full animate-pulse rounded bg-white/10" />
      <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-white/10" />
    </div>
  </div>
)

const AuthRedirect = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  const location = useLocation()
  const analytics = useAppAnalytics()

  useEffect(() => {
    analytics.trackPageView(location.pathname)
  }, [location.pathname, analytics])

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Landing />} />
          <Route
            path="/login"
            element={
              <AuthRedirect>
                <Login />
              </AuthRedirect>
            }
          />
          <Route
            path="/register"
            element={
              <AuthRedirect>
                <Register />
              </AuthRedirect>
            }
          />
          <Route path="/payment" element={<Payment />} />

          <Route element={<MainLayout />}>
            <Route path="/contact" element={<Contact />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/donate" element={<DonatePage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/study" element={<Study />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

export default App
