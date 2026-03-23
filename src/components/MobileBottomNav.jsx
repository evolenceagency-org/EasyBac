import { motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Timer, ListTodo, BarChart3, Brain } from 'lucide-react'

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Study', path: '/study', icon: Timer },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 },
  { label: 'Profile', path: '/personalization', icon: Brain }
]

const MobileBottomNav = () => {
  return (
    <motion.nav
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-1 rounded-t-2xl border border-white/10 bg-white/5 px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex min-w-[58px] flex-1 flex-col items-center justify-center rounded-xl px-2 py-1.5 text-[10px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/25 to-blue-500/25 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-200' : 'text-white/70'}`} />
                  <span className="mt-1 leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </motion.nav>
  )
}

export default MobileBottomNav
