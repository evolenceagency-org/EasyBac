import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Timer,
  ListTodo,
  BarChart3,
  BadgeDollarSign,
  Heart,
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
  { label: 'Donate', path: '/donate', icon: Heart, variant: 'donate', badge: 'NEW' },
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
    <>
      <div className="flex flex-col gap-4">
        {!collapsed && (
          <p className="px-2 text-[11px] uppercase tracking-normal text-zinc-500">
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

      <div className="flex flex-col gap-4">
        {!collapsed && (
          <p className="px-2 text-[11px] uppercase tracking-normal text-zinc-500">
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
            variant={link.variant}
            badge={link.badge}
          />
        ))}
      </div>

    </>
  )
}

const Sidebar = ({ isMobileOpen, onMobileClose, collapsed, onToggleCollapsed }) => {
  const { user, profile, signOut } = useAuth()
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const isExternallyControlled = typeof collapsed === 'boolean'
  const resolvedCollapsed = isExternallyControlled ? collapsed : internalCollapsed
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

      {/* Desktop: fixed sidebar */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-60 flex-col bg-black/40 backdrop-blur-xl border-r border-white/10 md:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/10 via-blue-500/5 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="relative z-10 flex items-center gap-3 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            {!resolvedCollapsed && (
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-normal text-zinc-400">
                  BacTracker
                </p>
                <h1 className="text-sm font-semibold">Study Command</h1>
              </div>
            )}
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            <SidebarContent
              collapsed={resolvedCollapsed}
              onLinkClick={onMobileClose}
              subscriptionBadge={subscriptionBadge}
              user={user}
              onLogout={handleLogout}
            />
          </div>
        </div>

        <div className="relative z-10 border-t border-white/10 p-4">
          {subscriptionBadge && !resolvedCollapsed && (
            <div className="mb-3 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white">
              {subscriptionBadge}
            </div>
          )}

          {user && (
            <div className="space-y-3">
              {!resolvedCollapsed ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <User className="h-4 w-4" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white transition hover:border-white/40"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

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
