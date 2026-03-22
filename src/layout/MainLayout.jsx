import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MainLayout = () => {
  const [sidebarOpen] = useState(true)
  const { user } = useAuth()

  return (
    <div className="relative flex min-h-screen w-full max-w-full bg-gradient-to-br from-black via-[#0a0a0f] to-[#050508] text-white">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen w-full max-w-full">
        {user && (
          <Sidebar
            isMobileOpen={sidebarOpen}
            onMobileClose={() => {}}
            collapsed={false}
          />
        )}
        <main className="ml-0 flex-1 min-h-screen max-w-full overflow-y-auto p-6 space-y-6 md:ml-60">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
