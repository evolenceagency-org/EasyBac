import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-zinc-900 to-zinc-800 text-white">
      <div className="pointer-events-none absolute -top-32 right-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen">
        {user && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">
          {user && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="glass mb-6 inline-flex rounded-xl px-3 py-2 text-sm text-white md:hidden"
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
