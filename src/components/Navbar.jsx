import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'
import { normalizeSubscriptionStatus } from '../utils/subscription.js'

const Navbar = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const rawPlan = profile?.subscription_status || profile?.plan || user?.plan || ''
  const plan = normalizeSubscriptionStatus(rawPlan)
  const showPremiumCta = Boolean(user && plan === 'trial')

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 md:top-6"
    >
      <nav className="flex w-full max-w-4xl items-center justify-between gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40 px-4 py-3 shadow-xl backdrop-blur-xl md:max-w-fit md:justify-center md:gap-6 md:px-6">
        <Link to="/" className="text-base font-semibold tracking-wide text-white sm:text-lg">
          BacTracker
        </Link>

        <div className="hidden items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/60 sm:flex sm:text-xs md:gap-6">
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
            className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 md:px-4"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-cyan-500 px-3 py-2 text-xs font-semibold text-black transition hover:scale-105 md:px-4"
          >
            Register
          </Link>
          {showPremiumCta && (
            <Link
              to="/payment"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-2 text-xs font-semibold text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] transition hover:scale-105"
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
