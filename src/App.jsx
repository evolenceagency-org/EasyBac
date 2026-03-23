import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import MainLayout from './layout/MainLayout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Payment from './pages/Payment.jsx'
import Verify from './pages/Verify.jsx'
import Verified from './pages/Verified.jsx'
import Landing from './pages/Landing.jsx'
import Contact from './pages/Contact.jsx'
import Pricing from './pages/Pricing.jsx'
import ChoosePlan from './pages/ChoosePlan.jsx'
import DonatePage from './pages/DonatePage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'
import useAppAnalytics from './hooks/useAppAnalytics.js'
import { supabaseConfigError } from './lib/supabaseClient.js'

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Study = lazy(() => import('./pages/Study.jsx'))
const Tasks = lazy(() => import('./pages/Tasks.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Personalization = lazy(() => import('./pages/Personalization.jsx'))
const AIResult = lazy(() => import('./pages/AIResult.jsx'))

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
  const { user, initialized } = useAuth()

  if (!initialized) {
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

  if (supabaseConfigError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <h1 className="text-2xl font-semibold">Environment setup required</h1>
          <p className="mt-3 text-sm text-white/70">
            {supabaseConfigError}. Configure these in Vercel environment variables and
            redeploy.
          </p>
        </div>
      </div>
    )
  }

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
          <Route path="/verify" element={<Verify />} />
          <Route path="/verified" element={<Verified />} />
          <Route path="/choose-plan" element={<ChoosePlan />} />
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
              <Route path="/personalization" element={<Personalization />} />
              <Route path="/ai-result" element={<AIResult />} />
              <Route path="/welcome-ai" element={<Navigate to="/ai-result" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  )
}

export default App
