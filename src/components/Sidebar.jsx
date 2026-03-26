import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Timer,
  ListTodo,
  BarChart3,
  Brain,
  SlidersHorizontal,
  BadgeDollarSign,
  Heart,
  Mail,
  LogOut,
  User,
  Crown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getTrialDaysLeft,
  isSubscriptionActive,
  normalizeSubscriptionStatus
} from '../utils/subscription.js'
import NavItem from './NavItem.jsx'

const SIDEBAR_STORAGE_KEY = 'easybac-sidebar-collapsed'

const mainLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Study', path: '/study', icon: BookOpen },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 }
]

const secondaryLinks = [
  { label: 'Personalization', path: '/personalization', icon: Brain },
  { label: 'AI Control', path: '/ai-control-center', icon: SlidersHorizontal },
  { label: 'Pricing', path: '/pricing', icon: BadgeDollarSign },
  { label: 'Donate', path: '/donate', icon: Heart, variant: 'donate', badge: 'NEW' },
  { label: 'Contact', path: '/contact', icon: Mail }
]

const cn = (...classes) => classes.filter(Boolean).join(' ')

const getInitialCollapsedState = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'
}

const SidebarSectionLabel = ({ collapsed, children }) => {
  if (collapsed) return null
  return <p className="px-2 text-[11px] uppercase tracking-[0.18em] text-white/40">{children}</p>
}

const SidebarActionButton = ({ collapsed, icon: Icon, label, onClick, tone = 'neutral', title }) => {
  const toneClass =
    tone === 'premium'
      ? 'border border-[rgba(139,92,246,0.25)] bg-[linear-gradient(90deg,rgba(139,92,246,0.95),rgba(168,85,247,0.95))] text-white hover:border-[rgba(139,92,246,0.4)]'
      : 'border border-transparent bg-transparent text-white/80 hover:border-[rgba(139,92,246,0.5)] hover:bg-white/[0.05] hover:text-white'

  return (
    <div className="group relative">
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ scale: 1.01, x: collapsed ? 0 : 1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'flex h-10 w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[12px] font-medium transition-all duration-200 ease-out',
          collapsed && 'justify-center px-0',
          toneClass
        )}
        title={title || label}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <motion.span
          className="whitespace-nowrap"
          initial={false}
          animate={{
            opacity: collapsed ? 0 : 1,
            x: collapsed ? -6 : 0,
            width: collapsed ? 0 : 'auto'
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ overflow: 'hidden' }}
        >
          {label}
        </motion.span>
      </motion.button>

      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 rounded-[6px] border border-white/[0.08] bg-[#111111] px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-opacity duration-200 group-hover:opacity-100">
          {label}
        </span>
      )}
    </div>
  )
}

const SidebarContent = ({ collapsed }) => {
  return (
    <>
      <div className="flex flex-col gap-3">
        <SidebarSectionLabel collapsed={collapsed}>Main</SidebarSectionLabel>
        <div className="flex flex-col gap-1.5">
          {mainLinks.map((link) => (
            <NavItem
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SidebarSectionLabel collapsed={collapsed}>Secondary</SidebarSectionLabel>
        <div className="flex flex-col gap-1.5">
          {secondaryLinks.map((link) => (
            <NavItem
              key={link.path}
              to={link.path}
              icon={link.icon}
              label={link.label}
              collapsed={collapsed}
              variant={link.variant}
              badge={link.badge}
            />
          ))}
        </div>
      </div>
    </>
  )
}

const Sidebar = () => {
  const { user, profile, signOut } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isCollapsed ? '1' : '0')
    document.documentElement.style.setProperty('--sidebar-width', isCollapsed ? '72px' : '240px')
  }, [isCollapsed])

  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => !prev)
  }

  const handleLogout = async () => {
    await signOut()
  }

  const plan = normalizeSubscriptionStatus(profile?.subscription_status)
  const showUpgrade = Boolean(profile && plan === 'trial' && !profile.payment_verified)

  const subscriptionBadge = useMemo(() => {
    if (!profile) return null
    if (profile.payment_verified) return 'Premium Access'
    if (isSubscriptionActive(profile)) {
      const daysLeft = getTrialDaysLeft(profile)
      return `Trial - ${daysLeft} days left`
    }
    return 'Payment Required'
  }, [profile])

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed left-0 top-0 z-50 hidden h-screen overflow-visible border-r border-white/[0.05] bg-[#050507] md:flex"
    >
      <div className="relative flex h-full w-full flex-col overflow-visible">
        <button
          type="button"
          onClick={handleToggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute right-[-12px] top-8 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-[#111111] text-white/70 shadow-[0_8px_20px_rgba(0,0,0,0.25)] transition hover:border-[rgba(139,92,246,0.4)] hover:bg-[#151515] hover:text-white"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <div className={cn('hide-scrollbar flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-4', isCollapsed && 'px-2')}>
          <div className={cn('flex items-center gap-3 pb-2', isCollapsed && 'justify-center')}> 
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.16)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.14)]">
              <BookOpen className="h-4 w-4" />
            </div>
            <motion.div
              initial={false}
              animate={{
                opacity: isCollapsed ? 0 : 1,
                x: isCollapsed ? -6 : 0,
                width: isCollapsed ? 0 : 'auto'
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
              className="leading-tight"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/42">BacTracker</p>
              <h1 className="text-[13px] font-semibold text-white/92">Study Command</h1>
            </motion.div>
          </div>

          <div className="flex flex-col gap-4">
            <SidebarContent collapsed={isCollapsed} />
          </div>
        </div>

        <div className="border-t border-white/[0.05] p-3">
          {subscriptionBadge && (
            <div
              className={cn(
                'mb-2.5 rounded-full border border-white/[0.06] bg-white/[0.03] text-white',
                isCollapsed ? 'flex h-10 w-10 items-center justify-center px-0 py-0' : 'px-3 py-1 text-[11px]'
              )}
              title={subscriptionBadge}
            >
              {isCollapsed ? <Crown className="h-4 w-4" /> : subscriptionBadge}
            </div>
          )}

          {showUpgrade && (
            <Link
              to="/payment"
              className={cn(
                'mb-2.5 inline-flex items-center justify-center rounded-[10px] border border-[rgba(139,92,246,0.25)] bg-[linear-gradient(90deg,rgba(139,92,246,0.95),rgba(168,85,247,0.95))] px-3 py-2 text-[11px] font-semibold text-white transition hover:border-[rgba(139,92,246,0.4)] hover:opacity-95',
                isCollapsed && 'h-10 w-10 px-0 py-0'
              )}
              title="Upgrade Premium"
            >
              {isCollapsed ? <Crown className="h-4 w-4" /> : 'Upgrade'}
            </Link>
          )}

          {user && (
            <div className="space-y-2.5">
              <div
                className={cn(
                  'flex items-center gap-2 text-[11px] text-white/45',
                  isCollapsed && 'justify-center'
                )}
                title={user.email}
              >
                <User className="h-3.5 w-3.5" />
                <motion.p
                  initial={false}
                  animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -6 : 0, width: isCollapsed ? 0 : 'auto' }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ overflow: 'hidden' }}
                  className="truncate"
                >
                  {user.email}
                </motion.p>
              </div>

              <SidebarActionButton
                collapsed={isCollapsed}
                icon={LogOut}
                label="Logout"
                onClick={handleLogout}
                title="Logout"
              />
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar
