import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { hasPremiumAccess, normalizeSubscriptionStatus } from '../utils/subscription.js'

const Navbar = () => {
  const { user, profile } = useAuth()
  const rawPlan = profile?.subscription_status || profile?.plan || user?.plan || ''
  const plan = normalizeSubscriptionStatus(rawPlan)
  const showPremiumCta = Boolean(user && !hasPremiumAccess(profile) && plan !== 'premium_trial')

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 md:top-5"
    >
      <nav className="surface-subtle flex w-full max-w-3xl items-center justify-between gap-2 overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 backdrop-blur-[20px] md:max-w-fit md:justify-center md:gap-5 md:px-5">
        <Link to="/" className="text-sm font-semibold tracking-wide text-white sm:text-base">
          BacTracker
        </Link>

        <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/55 sm:flex sm:text-[11px] md:gap-5">
          <a href="#features" className="transition hover:text-white">
            Features
          </a>
          <a href="#insights" className="transition hover:text-white">
            Insights
          </a>
          <a href="#faq" className="transition hover:text-white">
            FAQ
          </a>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Link
            to="/login"
            className="surface-subtle rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:border-[rgba(139,92,246,0.5)] hover:bg-white/[0.05] md:px-4 md:py-2"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-[#5B8CFF] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:scale-105 hover:bg-[#4E7EEA] md:px-4 md:py-2"
          >
            Register
          </Link>
          {showPremiumCta && (
            <Link
              to="/checkout"
              className="rounded-xl bg-[#5B8CFF] px-4 py-1.5 text-[11px] font-semibold text-white transition hover:scale-105 hover:bg-[#4E7EEA] md:px-5 md:py-2"
            >
              Upgrade
            </Link>
          )}
        </div>
      </nav>
    </motion.header>
  )
}

export default Navbar

