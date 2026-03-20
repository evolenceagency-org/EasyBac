import { useLocation, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getTrialDaysLeft, isSubscriptionActive } from '../utils/subscription.js'

const mainLinks = [
  { label: 'Dashboard', path: '/dashboard', icon: 'D' },
  { label: 'Study', path: '/study', icon: 'S' },
  { label: 'Tasks', path: '/tasks', icon: 'T' },
  { label: 'Analytics', path: '/analytics', icon: 'A' }
]

const secondaryLinks = [
  { label: 'Pricing', path: '/pricing', icon: 'P' },
  { label: 'Contact', path: '/contact', icon: 'C' }
]

const Sidebar = ({ isOpen, onClose }) => {
  const { pathname } = useLocation()
  const { user, profile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  const renderLink = (link) => {
    const isActive =
      pathname === link.path || pathname.startsWith(`${link.path}/`)
    return (
      <NavLink
        key={link.path}
        to={link.path}
        onClick={onClose}
        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
          isActive ? 'bg-white text-zinc-900' : 'text-zinc-200 hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold text-white">
            {link.icon}
          </span>
          <span>{link.label}</span>
        </div>
      </NavLink>
    )
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
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col gap-8 border-r border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
              BacTracker
            </p>
            <h1 className="mt-2 text-xl font-semibold">Study Command</h1>
            <p className="mt-1 text-sm text-zinc-400">Moroccan Bac 2026</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-2 py-1 text-xs text-white md:hidden"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Main
            </p>
            {mainLinks.map(renderLink)}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Secondary
            </p>
            {secondaryLinks.map(renderLink)}
          </div>

          <div className="flex-1" />

          <div className="border-t border-white/10 pt-4">
            {subscriptionBadge && (
              <div className="mb-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white">
                {subscriptionBadge}
              </div>
            )}
            {user && (
              <div className="space-y-3">
                <div className="text-xs text-gray-400 truncate">{user.email}</div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
