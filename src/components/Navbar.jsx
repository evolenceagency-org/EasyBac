import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext.jsx'

const Navbar = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const plan = profile?.plan || profile?.subscription_status || user?.plan || ''
  const isFreeTrial = plan === 'free_trial' || plan === 'trial'
  const showPremiumCta = Boolean(user && isFreeTrial)

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed top-4 left-1/2 z-50 w-full max-w-6xl -translate-x-1/2 px-4"
    >
      <div className="fixed top-6 left-1/2 z-50 w-full -translate-x-1/2 px-4 flex justify-center">
        <nav className="flex max-w-fit items-center gap-8 rounded-2xl border border-white/10 bg-black/40 px-6 py-3 shadow-xl backdrop-blur-xl">
          <Link to="/" className="text-base font-semibold tracking-wide text-white sm:text-lg">
            BacTracker
          </Link>

          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/60 sm:text-xs md:gap-6">
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
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-black transition hover:scale-105"
            >
              Register
            </Link>
            {showPremiumCta && (
              <button
                type="button"
                onClick={() => navigate('/payment')}
                className="rounded-xl bg-gradient-to-r from-purple-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:scale-105"
              >
                Get Premium
              </button>
            )}
          </div>
        </nav>
      </div>
    </motion.header>
  )
}

export default Navbar
