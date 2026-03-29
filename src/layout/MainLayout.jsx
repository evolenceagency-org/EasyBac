import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import MobileBottomNav from '../components/MobileBottomNav.jsx'
import DynamicIsland from '../components/DynamicIsland.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { isPersonalized } from '../utils/personalization.js'
import { readAiControlCenterSettings } from '../utils/aiControlCenter.js'

const MainLayout = () => {
  const { user, session, loading, profile } = useAuth()
  const location = useLocation()
  const isAuthenticated = Boolean(user || session)
  const hasSidebar = Boolean(loading || isAuthenticated)
  const onboardingPersonalization =
    (location.pathname === '/personalization' || location.pathname === '/onboarding') &&
    !isPersonalized(profile)
  const controlCenterSettings = useMemo(
    () => readAiControlCenterSettings(profile?.id || user?.id),
    [profile?.id, user?.id]
  )
  const shouldForceOnboarding =
    isAuthenticated &&
    profile &&
    !isPersonalized(profile) &&
    location.pathname !== '/onboarding' &&
    location.pathname !== '/personalization'

  if (shouldForceOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  const hideSidebar =
    location.pathname === '/onboarding' ||
    location.pathname === '/choose-plan' ||
    location.pathname === '/checkout' ||
    location.pathname === '/payment-pending' ||
    location.pathname === '/ai-result' ||
    location.pathname === '/welcome-ai' ||
    onboardingPersonalization
  const showSidebar = hasSidebar && !hideSidebar
  const mobileBottomNavRoutes = new Set([
    '/dashboard',
    '/study',
    '/analytics'
  ])
  const showMobileBottomNav =
    hasSidebar && !onboardingPersonalization && mobileBottomNavRoutes.has(location.pathname)
  const showDynamicIsland =
    isAuthenticated &&
    !onboardingPersonalization &&
    controlCenterSettings.assistant?.visible !== false
  const mobileBottomPadding = showMobileBottomNav
    ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]'
    : 'pb-4'
  const assistantBottomPadding = showDynamicIsland ? 'md:pb-24' : 'md:pb-6'
  const assistantTopPadding = showDynamicIsland ? 'pt-20' : 'pt-4'

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden text-white">
      <div className="relative z-10 flex min-h-screen w-full max-w-full">
        {showSidebar && <Sidebar />}

        <main
          className={`ml-0 flex-1 min-h-screen max-w-full overflow-y-auto overflow-x-hidden px-4 ${assistantTopPadding} space-y-4 md:space-y-6 md:p-6 ${mobileBottomPadding} ${assistantBottomPadding} ${
            showSidebar ? 'md:ml-[var(--sidebar-width)]' : ''
          }`}
        >
          <Outlet />
        </main>

        {showMobileBottomNav && <MobileBottomNav />}
        {showDynamicIsland && <DynamicIsland />}
      </div>
    </div>
  )
}

export default MainLayout

