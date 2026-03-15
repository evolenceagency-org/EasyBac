import { memo } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { checkSubscription, getTrialDaysLeft } from '../utils/subscription.js'

const Navbar = ({ onMenuClick }) => {
  const { user, profile, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  let subscriptionBadge = null
  if (profile) {
    const subscription = checkSubscription(profile)
    if (subscription.status === 'active') {
      subscriptionBadge = 'Premium Access'
    } else if (subscription.status === 'trial') {
      const daysLeft = getTrialDaysLeft(profile)
      subscriptionBadge = `Trial - ${daysLeft} days left`
    } else {
      subscriptionBadge = 'Subscription Required'
    }
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="glass rounded-xl px-3 py-2 text-sm text-white md:hidden"
        >
          Menu
        </button>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            BacTracker
          </p>
          <h2 className="text-xl font-semibold">Build your Bac momentum</h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="glass rounded-full px-4 py-2 text-xs text-zinc-300">
          Next milestone: June 4, 2026
        </div>
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
