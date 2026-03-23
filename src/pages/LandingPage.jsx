import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Brain, Timer, LineChart, Target, Sparkles, Flame, ChevronDown } from 'lucide-react'
import Hero from '../components/Hero.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const features = [
  { title: 'Deep Study Tracking', desc: 'Capture focused sessions with clarity.', icon: Timer },
  { title: 'Pomodoro Focus', desc: 'Stay in rhythm with smart cycles.', icon: Target },
  { title: 'Productivity Analytics', desc: 'See trends and momentum at a glance.', icon: LineChart },
  { title: 'Subject Focus', desc: 'Rebalance weak subjects quickly.', icon: Brain },
  { title: 'AI Guidance', desc: 'Suggestions tailored to your behavior.', icon: Sparkles },
  { title: 'Streak Engine', desc: 'Build consistency with daily goals.', icon: Flame }
]

const insightLines = [
  'You focused more on Math this week.',
  'Your study time dropped yesterday.',
  'Try adding a 45min Physics session.'
]

const tabs = [
  { id: 'dashboard', title: 'Dashboard', desc: 'Daily focus, streaks, and totals.' },
  { id: 'tasks', title: 'Tasks', desc: 'Plan, execute, and close tasks fast.' },
  { id: 'analytics', title: 'Analytics', desc: 'Insights across subjects and time.' }
]

const faqs = [
  { q: 'Is it free?', a: 'Yes, you get a 3-day full access trial.' },
  { q: 'Do I need payment?', a: 'Only after the trial ends. Upgrade anytime.' },
  { q: 'Does it work on phone?', a: 'Yes, BacTracker is mobile optimized.' }
]

const GlassButton = ({ to, children }) => (
  <Link
    to={to}
    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(34,211,238,0.35)] transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(34,211,238,0.5)]"
  >
    {children}
  </Link>
)

const FeaturesSection = () => (
  <section id="features" className="relative py-16 md:py-24">
    <div className="mx-auto max-w-6xl px-4 md:px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Features</p>
        <h2 className="mt-4 text-2xl font-semibold sm:text-4xl">Built for serious focus</h2>
        <p className="mt-3 text-sm text-white/70 sm:text-base">
          The tools you need to plan, execute, and reflect on every session.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-4 md:mt-12 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              whileHover={{ scale: 1.04 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_25px_rgba(124,58,237,0.18)] backdrop-blur-xl md:p-6"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-white/70">{feature.desc}</p>
            </motion.div>
          )
        })}
      </div>
    </div>
  </section>
)

const InsightsSection = () => (
  <section id="insights" className="relative py-16 md:py-24">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-blue-600/10 to-cyan-500/10" />
    <div className="relative mx-auto grid max-w-6xl gap-8 px-4 md:gap-10 md:px-6 lg:grid-cols-2 lg:items-center">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="space-y-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Insights</p>
        <h2 className="text-2xl font-semibold sm:text-4xl">Smart study insights</h2>
        <p className="text-sm text-white/70 sm:text-base">
          BacTracker surfaces patterns you might miss and suggests what to do next.
        </p>
      </motion.div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_35px_rgba(59,130,246,0.25)] backdrop-blur-xl md:p-6"
      >
        <div className="text-xs uppercase tracking-[0.3em] text-white/50">Insight feed</div>
        <div className="mt-4 space-y-3">
          {insightLines.map((line) => (
            <motion.div
              key={line}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80"
            >
              {line}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
)

const ProductPreview = () => {
  const [active, setActive] = useState(tabs[0])

  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Product preview</p>
          <h2 className="mt-4 text-2xl font-semibold sm:text-4xl">Your command center</h2>
          <p className="mt-3 text-sm text-white/70">
            Switch between key surfaces for a quick look.
          </p>
        </motion.div>

        <div className="mt-8 flex flex-wrap justify-center gap-2 md:mt-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300 ${
                active.id === tab.id
                  ? 'bg-white text-black'
                  : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div className="relative mt-8 md:mt-10">
          <div className="pointer-events-none absolute inset-0 hidden bg-purple-500/10 blur-[80px] md:block" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative mx-auto grid max-w-3xl gap-4 md:gap-6"
            >
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-6">
                <h3 className="text-xl font-semibold">{active.title}</h3>
                <p className="mt-2 text-sm text-white/70">{active.desc}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
                {['Dashboard', 'Tasks', 'Analytics'].map((label) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/70 shadow-[0_0_20px_rgba(255,255,255,0.08)] backdrop-blur-xl md:p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
                    <div className="mt-4 space-y-2">
                      <div className="h-2 w-3/4 rounded-full bg-white/10" />
                      <div className="h-2 w-full rounded-full bg-white/10" />
                      <div className="h-8 rounded-xl bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="py-16 md:py-24">
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">FAQ</p>
          <h2 className="mt-4 text-2xl font-semibold sm:text-4xl">Frequently asked questions</h2>
        </motion.div>

        <div className="mt-8 space-y-3 md:mt-10 md:space-y-4">
          {faqs.map((item, index) => {
            const open = openIndex === index
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl md:p-5"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold text-white"
                >
                  {item.q}
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-white/60" />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 text-sm text-white/70"
                    >
                      {item.a}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

const CTASection = () => (
  <section className="py-16 md:py-24">
    <div className="mx-auto max-w-5xl px-4 md:px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-purple-600/30 via-blue-600/20 to-transparent p-6 text-center md:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_60%)]" />
        <div className="relative space-y-6">
          <h2 className="text-2xl font-semibold sm:text-4xl">Your highest score starts today.</h2>
          <p className="text-sm text-white/70 sm:text-base">
            Join BacTracker and build the habits that drive success.
          </p>
          <GlassButton to="/register">Start Free Trial</GlassButton>
        </div>
      </motion.div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="border-t border-white/10 py-12">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center text-sm text-white/60 md:flex-row md:justify-between md:px-6 md:text-left">
      <div>
        <p className="text-lg font-semibold text-white">BacTracker</p>
        <p className="mt-2 text-xs text-white/50">Built for premium Bac performance.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.2em] text-white/50">
        <span>Features</span>
        <span>Pricing</span>
        <span>Contact</span>
      </div>
      <p className="text-xs text-white/40">© 2026 BacTracker</p>
    </div>
  </footer>
)

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden bg-black text-white">
      <Hero />
      <FeaturesSection />
      <InsightsSection />
      <ProductPreview />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  )
}

export default LandingPage
