import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = window.localStorage.getItem('sidebar-collapsed')
    return saved === 'true'
  })
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  const sidebarOffset = user ? (isCollapsed ? '80px' : '260px') : '0px'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen">
        {user && (
          <Sidebar
            isMobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
            collapsed={isCollapsed}
            onToggleCollapsed={() => setIsCollapsed((prev) => !prev)}
          />
        )}
        <main
          className="flex-1 px-6 py-6 transition-all duration-300 ease-in-out md:px-8 md:py-8 md:ml-[var(--sidebar-offset)]"
          style={{ '--sidebar-offset': sidebarOffset }}
        >
          {user && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="glass mb-6 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white md:hidden"
            >
              Menu
            </button>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
