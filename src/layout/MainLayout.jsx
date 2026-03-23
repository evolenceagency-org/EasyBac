import { Navigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import MobileBottomNav from '../components/MobileBottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isPersonalized } from '../utils/personalization.js'

const MainLayout = () => {
  const { user, session, loading, profile } = useAuth()
  const location = useLocation()
  const isAuthenticated = Boolean(user || session)
  const hasSidebar = Boolean(loading || isAuthenticated)
  const onboardingPersonalization =
    location.pathname === '/personalization' && !isPersonalized(profile)
  const shouldForceOnboarding =
    isAuthenticated &&
    profile &&
    !isPersonalized(profile) &&
    location.pathname !== '/personalization'

  if (shouldForceOnboarding) {
    return <Navigate to="/personalization" replace />
  }

  const hideSidebar =
    location.pathname === '/choose-plan' ||
    location.pathname === '/welcome-ai' ||
    onboardingPersonalization
  const showSidebar = hasSidebar && !hideSidebar
  const mobileBottomNavRoutes = new Set([
    '/dashboard',
    '/study',
    '/tasks',
    '/analytics',
    '/personalization',
    '/pricing',
    '/donate',
    '/contact'
  ])
  const showMobileBottomNav =
    hasSidebar && !onboardingPersonalization && mobileBottomNavRoutes.has(location.pathname)
  const mobileBottomPadding = showMobileBottomNav
    ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom))]'
    : 'pb-4'

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="pointer-events-none absolute -top-32 right-0 hidden h-72 w-72 rounded-full bg-violet-500/10 blur-3xl md:block" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 hidden h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl md:block" />
      <div className="pointer-events-none absolute bottom-0 left-0 hidden h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl md:block" />

      <div className="relative z-10 flex min-h-screen w-full max-w-full">
        {showSidebar && <Sidebar />}

        <main
          className={`ml-0 flex-1 min-h-screen max-w-full overflow-y-auto overflow-x-hidden px-4 pt-4 space-y-4 md:space-y-6 md:p-6 ${mobileBottomPadding} ${
            showSidebar ? 'md:ml-60' : ''
          }`}
        >
          <Outlet />
        </main>

        {showMobileBottomNav && <MobileBottomNav />}
      </div>
    </div>
  )
}

export default MainLayout
