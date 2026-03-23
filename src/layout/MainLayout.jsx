import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import MobileBottomNav from '../components/MobileBottomNav.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MainLayout = () => {
  const { user, session, loading } = useAuth()
  const location = useLocation()
  const hasSidebar = Boolean(loading || user || session)
  const hideSidebar = location.pathname === '/choose-plan'
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
    hasSidebar && mobileBottomNavRoutes.has(location.pathname)
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
