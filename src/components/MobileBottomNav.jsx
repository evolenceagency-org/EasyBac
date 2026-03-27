import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  Brain,
  GraduationCap,
  Heart,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  Settings,
  SlidersHorizontal
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/study', label: 'Study', icon: BookOpen },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'settings', label: 'Settings', icon: Settings, type: 'sheet' }
]

const secondaryItems = [
  {
    title: 'Product',
    items: [
      { key: 'personalization', label: 'Personalization', icon: Brain, path: '/personalization' },
      { key: 'ai-control', label: 'AI Control', icon: SlidersHorizontal, path: '/ai-control-center' },
      { key: 'exam-simulation', label: 'Exam Simulation', icon: GraduationCap, path: '/exam-simulation' }
    ]
  },
  {
    title: 'Business',
    items: [
      { key: 'pricing', label: 'Pricing', icon: BadgeDollarSign, path: '/pricing' },
      { key: 'donate', label: 'Donate', icon: Heart, path: '/donate' },
      { key: 'contact', label: 'Contact', icon: Mail, path: '/contact' }
    ]
  }
]

const MobileBottomNav = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    setIsSettingsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    if (isSettingsOpen) {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSettingsOpen])

  const handleSelectSecondaryItem = (path) => {
    setIsSettingsOpen(false)
    navigate(path)
  }

  const handleLogout = async () => {
    setIsSettingsOpen(false)
    await signOut()
    navigate('/login')
  }

  const content = (
    <>
      <AnimatePresence>
        {isSettingsOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close secondary menu"
              className="mobile-nav-sheet-overlay md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => setIsSettingsOpen(false)}
            />

            <motion.div
              className="mobile-nav-sheet md:hidden"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 240 }}
              dragElastic={0.08}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80) {
                  setIsSettingsOpen(false)
                }
              }}
            >
              <div className="mobile-nav-sheet-handle" />
              <div className="mobile-nav-sheet-content">
                {secondaryItems.map((section) => (
                  <div key={section.title} className="mobile-nav-sheet-section">
                    <p className="mobile-nav-sheet-section-title">{section.title}</p>
                    <div className="mobile-nav-sheet-group">
                      {section.items.map((item) => {
                        const Icon = item.icon
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => handleSelectSecondaryItem(item.path)}
                            className="mobile-nav-sheet-item"
                          >
                            <Icon className="h-5 w-5 text-white/80" strokeWidth={2.15} />
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mobile-nav-sheet-item mobile-nav-sheet-item-logout"
                >
                  <LogOut className="h-5 w-5" strokeWidth={2.15} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div
        className="mobile-navbar-shell fixed md:hidden pointer-events-none"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 997,
          width: '90%',
          maxWidth: '500px'
        }}
      >
        <div className="mobile-navbar-inner pointer-events-auto">
          <div className="mobile-navbar-track">
            {navItems.map((item) => {
              const isSheetTrigger = item.type === 'sheet'
              const isActive = isSheetTrigger ? isSettingsOpen : location.pathname === item.path
              const Icon = item.icon

              if (isSheetTrigger) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-label={item.label}
                    onClick={() => setIsSettingsOpen(true)}
                    className="flex h-full flex-1 items-center justify-center"
                  >
                    <motion.div
                      initial={false}
                      animate={{
                        y: isActive ? -4 : 0,
                        scale: isActive ? 1.05 : 1,
                        opacity: isActive ? 1 : 0.66
                      }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      whileTap={{ scale: 0.97 }}
                      className={`mobile-nav-item ${isActive ? 'is-active' : ''}`}
                    >
                      <Icon className="mobile-nav-icon" strokeWidth={2.35} />
                    </motion.div>
                  </button>
                )
              }

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
                      scale: isActive ? 1.05 : 1,
                      opacity: isActive ? 1 : 0.66
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    whileTap={{ scale: 0.97 }}
                    className={`mobile-nav-item ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon className="mobile-nav-icon" strokeWidth={2.35} />
                  </motion.div>
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )

  if (typeof document === 'undefined') return null

  return createPortal(content, document.body)
}

export default MobileBottomNav
