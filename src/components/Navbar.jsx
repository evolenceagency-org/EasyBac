import { memo } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getTrialDaysLeft, isSubscriptionActive } from '../utils/subscription.js'

const Navbar = ({ onMenuClick }) => {
  const { user, profile, signOut } = useAuth()

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

  const navLinks = user
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Study', to: '/study' },
        { label: 'Tasks', to: '/tasks' },
        { label: 'Analytics', to: '/analytics' }
      ]
    : [
        { label: 'Home', to: '/' },
        { label: 'Login', to: '/login' },
        { label: 'Register', to: '/register' },
        { label: 'Contact', to: '/contact' }
      ]

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
      <div className="flex items-center gap-3">
        {onMenuClick && user && (
          <button
            type="button"
            onClick={onMenuClick}
            className="glass rounded-xl px-3 py-2 text-sm text-white md:hidden"
          >
            Menu
          </button>
        )}
        <Link to="/" className="block">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            BacTracker
          </p>
          <h2 className="text-xl font-semibold">Build your Bac momentum</h2>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full border px-4 py-2 transition ${
                  isActive
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-zinc-300 hover:border-white/30'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {subscriptionBadge && (
          <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-white">
            {subscriptionBadge}
          </div>
        )}
        {user && (
          <>
            <div className="glass rounded-full px-4 py-2 text-xs text-zinc-200">
              {user.email}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  )
}

export default memo(Navbar)
