import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, session, loading } = useAuth()
  const location = useLocation()
  const hasSidebar = Boolean(loading || user || session)
  const hideSidebar = location.pathname === '/choose-plan'
  const showSidebar = hasSidebar && !hideSidebar

  return (
    <div className="relative flex min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen w-full max-w-full">
        {showSidebar && (
          <Sidebar
            isMobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
            collapsed={false}
          />
        )}

        {showSidebar && (
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="fixed bottom-6 left-6 z-40 rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.25)] backdrop-blur-xl transition hover:scale-[1.03] md:hidden"
          >
            Menu
          </button>
        )}

        <main
          className={`ml-0 flex-1 min-h-screen max-w-full overflow-y-auto overflow-x-hidden p-6 space-y-6 ${
            showSidebar ? 'md:ml-60' : ''
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
