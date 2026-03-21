import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Timer,
  ListTodo,
  BarChart3,
  BadgeDollarSign,
  Mail,
  LogOut,
  ChevronLeft,
  User
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getTrialDaysLeft, isSubscriptionActive } from '../utils/subscription.js'
import NavItem from './NavItem.jsx'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const mainLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Study', path: '/study', icon: Timer },
  { label: 'Tasks', path: '/tasks', icon: ListTodo },
  { label: 'Analytics', path: '/analytics', icon: BarChart3 }
]

const secondaryLinks = [
  { label: 'Pricing', path: '/pricing', icon: BadgeDollarSign },
  { label: 'Contact', path: '/contact', icon: Mail }
]

const SidebarContent = ({
  collapsed,
  onLinkClick,
  subscriptionBadge,
  user,
  onLogout
}) => {
  return (
    <div className="relative z-10 flex flex-1 flex-col gap-6 px-3">
      <div className="flex flex-col gap-2">
        {!collapsed && (
          <p className="px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Main
          </p>
        )}
        {mainLinks.map((link) => (
          <NavItem
            key={link.path}
            to={link.path}
            icon={link.icon}
            label={link.label}
            collapsed={collapsed}
            onClick={onLinkClick}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {!collapsed && (
          <p className="px-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
            Secondary
          </p>
        )}
        {secondaryLinks.map((link) => (
          <NavItem
            key={link.path}
            to={link.path}
            icon={link.icon}
            label={link.label}
            collapsed={collapsed}
            onClick={onLinkClick}
          />
        ))}
      </div>

      <div className="flex-1" />

      <div className="border-t border-white/10 px-3 pb-5 pt-4">
        {subscriptionBadge && !collapsed && (
          <div className="mb-3 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white">
            {subscriptionBadge}
          </div>
        )}

        {user && (
          <div className="space-y-3">
            {!collapsed ? (
              <>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <User className="h-4 w-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 text-white transition hover:border-white/40"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const Sidebar = ({ isMobileOpen, onMobileClose, collapsed, onToggleCollapsed }) => {
  const { user, profile, signOut } = useAuth()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const resolvedCollapsed = typeof collapsed === 'boolean' ? collapsed : internalCollapsed
  const handleToggle = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed()
      return
    }
    setInternalCollapsed((prev) => !prev)
  }

  const handleLogout = async () => {
    await signOut()
  }

  let subscriptionBadge = null
  if (profile) {
    if (profile.payment_verified) {
      subscriptionBadge = 'Premium Access'
    } else if (isSubscriptionActive(profile)) {
      const daysLeft = getTrialDaysLeft(profile)
      subscriptionBadge = `Trial - ${daysLeft} days left`
    } else {
      subscriptionBadge = 'Payment Required'
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition md:hidden ${
          isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Desktop: centered with gradient border */}
      <div className="fixed left-0 top-0 z-50 hidden h-screen items-center md:flex">
        <div
          className={cn(
            'relative rounded-2xl p-[1px]',
            'bg-gradient-to-b from-purple-500/30 via-blue-500/20 to-transparent',
            resolvedCollapsed && 'opacity-60'
          )}
        >
          <motion.aside
            initial={false}
            animate={{ width: resolvedCollapsed ? 80 : 260 }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className={cn(
              'relative flex h-[90vh] flex-col overflow-hidden rounded-2xl bg-black/80 py-6 backdrop-blur-xl',
              'border border-white/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]'
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/10 via-blue-500/5 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />

            <div className="relative z-10 flex items-center justify-between px-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                {!resolvedCollapsed && (
                  <div className="leading-tight">
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                      BacTracker
                    </p>
                    <h1 className="text-lg font-semibold">Study Command</h1>
                  </div>
                )}
              </div>
            </div>

            <SidebarContent
              collapsed={resolvedCollapsed}
              onLinkClick={onMobileClose}
              subscriptionBadge={subscriptionBadge}
              user={user}
              onLogout={handleLogout}
            />
          </motion.aside>

          <motion.button
            type="button"
            onClick={handleToggle}
            className="absolute right-[-14px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/80 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)] backdrop-blur-md transition hover:shadow-[0_0_18px_rgba(139,92,246,0.45)]"
            whileHover={{ scale: 1.1 }}
            animate={{ rotate: resolvedCollapsed ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Mobile sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: resolvedCollapsed ? 80 : 260 }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className={`fixed left-0 top-0 z-50 flex h-full flex-col overflow-hidden border-r bg-black/80 py-6 backdrop-blur-xl md:hidden ${
          resolvedCollapsed ? 'border-white/5' : 'border-white/10'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/10 via-blue-500/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />

        <div className="relative z-10 flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            {!resolvedCollapsed && (
              <div className="leading-tight">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  BacTracker
                </p>
                <h1 className="text-lg font-semibold">Study Command</h1>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg border border-white/10 bg-white/5 p-1 text-white transition hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        <SidebarContent
          collapsed={resolvedCollapsed}
          onLinkClick={onMobileClose}
          subscriptionBadge={subscriptionBadge}
          user={user}
          onLogout={handleLogout}
        />
      </motion.aside>
    </>
  )
}

export default Sidebar
