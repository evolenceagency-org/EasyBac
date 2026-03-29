import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { BarChart3, BookOpen, LayoutDashboard } from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/study', label: 'Study', icon: BookOpen },
  { path: '/analytics', label: 'Analysis', icon: BarChart3 }
]

const MobileBottomNav = () => {
  const location = useLocation()

  const content = (
    <div
      className="mobile-navbar-shell fixed md:hidden pointer-events-none"
      style={{
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 997,
        width: '90%',
        maxWidth: '420px'
      }}
    >
      <div className="mobile-navbar-inner pointer-events-auto">
        <div className="mobile-navbar-track">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className="flex h-full flex-1 items-center justify-center"
              >
                <motion.div
                  initial={false}
                  animate={{
                    y: isActive ? -4 : 0,
                    scale: isActive ? 1.06 : 1,
                    opacity: isActive ? 1 : 0.66
                  }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  whileTap={{ scale: 0.97 }}
                  className={`mobile-nav-item ${isActive ? 'is-active' : ''}`}
                >
                  <Icon className="mobile-nav-icon" strokeWidth={2.2} />
                </motion.div>
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null

  return createPortal(content, document.body)
}

export default MobileBottomNav
