import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  BarChart3,
  Brain,
  Ellipsis,
  Heart,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  Timer
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [
  { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Study', path: '/study', icon: Timer },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Stats', path: '/analytics', icon: BarChart3 },
  { label: 'Profile', path: '/personalization', icon: Brain }
]

const quickActions = [
  { label: 'Pricing', path: '/pricing', icon: BadgeDollarSign },
  { label: 'Donate', path: '/donate', icon: Heart },
  { label: 'Contact', path: '/contact', icon: Mail }
]

const MobileBottomNav = () => {
  const [moreOpen, setMoreOpen] = useState(false)
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  const activeLabel = useMemo(() => {
    return navItems.find((item) => item.path === location.pathname)?.label || 'BacTracker'
  }, [location.pathname])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    if (moreOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow || 'auto'
    }
  }, [moreOpen])

  const handleLogout = async () => {
    await signOut()
    setMoreOpen(false)
    navigate('/login')
  }

  return (
    <>
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-neutral-900/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto flex max-w-xl items-center justify-between gap-1 rounded-t-2xl border border-white/10 bg-white/5 px-2 py-1.5 shadow-[0_0_25px_rgba(139,92,246,0.16)]">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex min-w-[52px] flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-all duration-200 ${
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

          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`flex min-w-[52px] flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-1.5 text-[10px] font-medium transition-all duration-200 ${
              moreOpen
                ? 'bg-gradient-to-r from-purple-500/25 to-blue-500/25 text-white shadow-[0_0_16px_rgba(139,92,246,0.3)]'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            }`}
          >
            <motion.div animate={{ rotate: moreOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <Ellipsis className={`h-4 w-4 ${moreOpen ? 'text-cyan-200' : 'text-white/70'}`} />
            </motion.div>
            <span className="mt-1 leading-none">More</span>
          </motion.button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            <motion.div
              initial={{ y: '100%', opacity: 0.9 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 320 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setMoreOpen(false)
                }
              }}
              onClick={(event) => event.stopPropagation()}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-white/10 bg-neutral-900/95 p-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] shadow-xl backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-white/20" />
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Quick Actions</p>
                <h3 className="mt-2 text-lg font-semibold text-white">{activeLabel}</h3>
              </div>

              <div className="space-y-2.5">
                {quickActions.map((action, index) => {
                  const Icon = action.icon
                  return (
                    <motion.button
                      key={action.path}
                      type="button"
                      onClick={() => {
                        setMoreOpen(false)
                        navigate(action.path)
                      }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ delay: index * 0.05, duration: 0.18, ease: 'easeOut' }}
                      whileTap={{ scale: 0.97 }}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-neutral-800/85 px-4 py-3 text-left text-sm text-white/90 transition hover:border-purple-400/35 hover:bg-neutral-800"
                    >
                      <Icon className="h-4 w-4 text-cyan-200" />
                      <span>{action.label}</span>
                    </motion.button>
                  )
                })}

                <motion.button
                  type="button"
                  onClick={handleLogout}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: 0.18, duration: 0.18, ease: 'easeOut' }}
                  whileTap={{ scale: 0.97 }}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-500/25 bg-red-900/35 px-4 py-3 text-left text-sm text-red-200 transition hover:bg-red-900/45"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default MobileBottomNav
