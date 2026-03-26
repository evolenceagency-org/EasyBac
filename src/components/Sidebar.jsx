import {
  LayoutDashboard,
  Timer,
  ListTodo,
  BarChart3,
  Brain,
  BadgeDollarSign,
  Heart,
  Mail,
  LogOut,
  User,
  SlidersHorizontal
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  getTrialDaysLeft,
  isSubscriptionActive,
  normalizeSubscriptionStatus
} from '../utils/subscription.js'
import NavItem from './NavItem.jsx'

const mainLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Study', path: '/study', icon: Timer },
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

const SidebarContent = () => {
  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="px-2 text-[11px] uppercase tracking-normal text-zinc-500">Main</p>
        {mainLinks.map((link) => (
          <NavItem
            key={link.path}
            to={link.path}
            icon={link.icon}
            label={link.label}
            collapsed={false}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <p className="px-2 text-[11px] uppercase tracking-normal text-zinc-500">Secondary</p>
        {secondaryLinks.map((link) => (
          <NavItem
            key={link.path}
            to={link.path}
            icon={link.icon}
            label={link.label}
            collapsed={false}
            variant={link.variant}
            badge={link.badge}
          />
        ))}
      </div>
    </>
  )
}

const Sidebar = () => {
  const { user, profile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  let subscriptionBadge = null
  const plan = normalizeSubscriptionStatus(profile?.subscription_status)
  const showUpgrade = Boolean(profile && plan === 'trial' && !profile.payment_verified)

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
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-56 flex-col border-r border-white/8 bg-black/32 backdrop-blur-xl md:flex">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-500/10 via-blue-500/5 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="relative z-10 flex items-center gap-2.5 pb-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8 text-white">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-normal text-zinc-400">BacTracker</p>
            <h1 className="text-[13px] font-semibold">Study Command</h1>
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          <SidebarContent />
        </div>
      </div>

      <div className="relative z-10 border-t border-white/8 p-3">
        {subscriptionBadge && (
          <div className="mb-2.5 rounded-full border border-white/8 bg-white/8 px-3 py-1 text-[11px] text-white">
            {subscriptionBadge}
          </div>
        )}

        {showUpgrade && (
          <Link
            to="/payment"
            className="mb-2.5 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-2 text-[11px] font-semibold text-black shadow-[0_8px_18px_rgba(34,211,238,0.22)] transition hover:scale-[1.01]"
          >
            Upgrade
          </Link>
        )}

        {user && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-lg border border-white/12 px-3 py-2 text-[11px] font-semibold text-white transition hover:border-white/25"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
