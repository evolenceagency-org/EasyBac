import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import heroLaptop from '../assets/video/hero-study-loop-dark-laptop.mp4'
import heroPhone from '../assets/video/hero-study-loop-dark-phone.mp4'
import iconClockPlus from '../assets/icons/clock-plus.svg'
import iconTimer from '../assets/icons/timer.svg'
import iconChartArea from '../assets/icons/chart-area.svg'
import iconBrainCircuit from '../assets/icons/brain-circuit.svg'
import iconListTodo from '../assets/icons/list-todo.svg'
import iconGraduationCap from '../assets/icons/graduation-cap.svg'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } }
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
}

const features = [
  {
    title: 'Deep Study Tracking',
    desc: 'Capture focused sessions and see daily momentum at a glance.',
    color: 'from-emerald-400/50 to-emerald-400/10',
    icon: iconClockPlus
  },
  {
    title: 'Pomodoro Focus',
    desc: 'Maintain rhythm with adaptive pomodoro cycles and breaks.',
    color: 'from-blue-400/50 to-blue-400/10',
    icon: iconTimer
  },
  {
    title: 'Productivity Analytics',
    desc: 'Measure creativity, streaks, and output with clarity.',
    color: 'from-violet-400/50 to-violet-400/10',
    icon: iconChartArea
  },
  {
    title: 'Subject Focus',
    desc: 'See weak subjects early and rebalance your week.',
    color: 'from-cyan-400/50 to-cyan-400/10',
    icon: iconBrainCircuit
  },
  {
    title: 'AI Guidance',
    desc: 'Receive smart suggestions tailored to your study behavior.',
    color: 'from-fuchsia-400/50 to-fuchsia-400/10',
    icon: iconListTodo
  },
  {
    title: 'Streak Engine',
    desc: 'Build consistency with dynamic streak tracking.',
    color: 'from-amber-400/50 to-amber-400/10',
    icon: iconGraduationCap
  }
]

const tabs = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    desc: 'See daily focus, streaks, and progress in one elegant view.'
  },
  {
    id: 'tasks',
    title: 'Tasks',
    desc: 'Turn plans into clear, trackable actions across subjects.'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    desc: 'Understand trends, creativity, and subject focus in minutes.'
  }
]

const faqs = [
  {
    q: 'Is it free?',
    a: 'Yes, you get 3 days of full access with no card required.'
  },
  {
    q: 'Do I need payment?',
    a: 'Only after the trial expires. You can upgrade anytime.'
  },
  {
    q: 'Does it work on phone?',
    a: 'Absolutely. The experience is optimized for mobile.'
  }
]

const GlassButton = ({ to, children, variant = 'primary' }) => {
  const base =
    'inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition'
  if (variant === 'primary') {
    return (
      <Link
        to={to}
        className={`${base} bg-gradient-to-r from-emerald-400 to-emerald-600 text-zinc-900 shadow-[0_0_30px_rgba(74,225,118,0.35)] hover:scale-[1.04]`}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link
      to={to}
      className={`${base} glass text-white hover:border-white/30 hover:shadow-[0_0_18px_rgba(255,255,255,0.15)]`}
    >
      {children}
    </Link>
  )
}

const Hero = () => {
  return (
    <section className="relative h-screen overflow-hidden">
      <video
        className="absolute inset-0 hidden h-full w-full object-cover md:block"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/landing-preview.png"
      >
        <source src={heroLaptop} type="video/mp4" />
      </video>
      <video
        className="absolute inset-0 h-full w-full object-cover md:hidden"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/landing-preview.png"
      >
        <source src={heroPhone} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

      <div className="absolute top-0 z-20 w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="text-xl font-semibold text-white">
            BacTracker
          </Link>
          <div className="hidden items-center gap-6 text-xs uppercase tracking-[0.3em] text-zinc-400 md:flex">
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#ai" className="hover:text-white">
              Insights
            </a>
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <GlassButton to="/login" variant="secondary">
              Sign in
            </GlassButton>
            <GlassButton to="/register">Start Free Trial</GlassButton>
          </div>
        </div>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto grid h-full w-full max-w-6xl gap-12 px-6 pb-16 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      >
        <div className="space-y-6">
          <motion.p
            variants={fadeUp}
            className="text-xs uppercase tracking-[0.35em] text-zinc-400"
          >
            Premium Bac Mastery
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="text-5xl font-semibold leading-[1.05] tracking-[0.015em] sm:text-6xl lg:text-7xl"
          >
            Master your <span className="text-emerald-300">Baccalaureate.</span>
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="max-w-xl text-base text-zinc-300/90 sm:text-lg"
          >
            The AI-powered system that tracks deep study time, analyzes
            productivity, and guides you to a top score.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
            <GlassButton to="/register">Start Free Trial</GlassButton>
            <GlassButton to="/register" variant="secondary">
              Watch Demo
            </GlassButton>
          </motion.div>
        </div>

        <motion.div
          className="hidden lg:block"
          variants={fadeUp}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative">
            <div className="glass rounded-3xl p-3 shadow-lg">
              <img
                src="/landing-preview.png"
                alt="BacTracker dashboard preview"
                className="rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl px-4 py-3 text-xs text-zinc-200 shadow-lg">
              +24% weekly improvement
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

const Features = () => (
  <section id="features" className="py-24">
    <div className="mx-auto max-w-6xl px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="mx-auto max-w-2xl text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
          Features
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-[0.01em] sm:text-4xl">
          Built for modern focus
        </h2>
        <p className="mt-3 text-sm text-zinc-300 sm:text-base">
          Everything you need to plan, execute, and reflect on your study
          journey.
        </p>
      </motion.div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: index * 0.05 }}
            whileHover={{ scale: 1.05, rotate: 0.6 }}
            className="glass group relative rounded-2xl p-6 shadow-lg transition hover:shadow-[0_0_35px_rgba(124,58,237,0.35)]"
          >
            <div className="relative mb-4 h-12 w-12">
              <div
                className={`absolute inset-0 rounded-full bg-gradient-to-br ${feature.color} blur-md`}
              />
              <div
                className={`relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${feature.color} backdrop-blur-xl`}
              >
                <img
                  src={feature.icon}
                  alt=""
                  className="h-5 w-5 brightness-0 invert"
                  aria-hidden="true"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-300">{feature.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
)

const AISection = () => {
  return (
    <section id="ai" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-blue-600/20 to-cyan-500/20" />
      <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-violet-500/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="space-y-6"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-300">
            Smart Study Insights
          </p>
          <h2 className="text-3xl font-semibold tracking-[0.01em] sm:text-4xl">
            Personalized study analysis
          </h2>
          <p className="text-sm text-zinc-200/90 sm:text-base">
            BacTracker highlights your trends and suggests the next best action
            to keep momentum.
          </p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="glass rounded-3xl p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 text-xs uppercase tracking-[0.3em] text-zinc-400">
            Insight Feed
          </div>
          <div className="mt-4 space-y-4 text-sm">
            {[
              'You focused more on Math this week.',
              'Your study time dropped yesterday.',
              'Try adding a 45min Physics session.'
            ].map((insight) => (
              <div
                key={insight}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                {insight}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const ProductPreview = () => {
  const [active, setActive] = useState(tabs[0])

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mx-auto mb-10 max-w-3xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Product Preview
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[0.01em] sm:text-4xl">
            Your command center
          </h2>
          <p className="mt-4 text-sm text-zinc-300/90">
            Switch tabs to explore the core surfaces of your workspace.
          </p>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                active.id === tab.id
                  ? 'bg-white text-zinc-900'
                  : 'border border-white/10 bg-white/5 text-white'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div className="relative mt-10">
          <div className="absolute inset-0 bg-emerald-400/10 blur-[80px]" />
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative mx-auto grid max-w-3xl gap-6"
            >
              <div className="glass rounded-3xl p-6">
                <h3 className="text-xl font-semibold tracking-[0.01em]">
                  {active.title}
                </h3>
                <p className="mt-3 text-sm text-zinc-300/90">
                  {active.desc}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {['Dashboard', 'Tasks', 'Analytics'].map((label) => (
                  <div
                    key={label}
                    className="glass rounded-2xl p-4 text-sm text-zinc-200 shadow-[0_0_25px_rgba(255,255,255,0.08)]"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                      {label}
                    </p>
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

const FAQ = () => {
  const [activeIndex, setActiveIndex] = useState(null)
  return (
    <section className="py-24">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[0.01em] sm:text-4xl">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="mt-10 space-y-4">
          {faqs.map((item, index) => {
            const open = activeIndex === index
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="glass rounded-2xl p-5"
              >
                <button
                  type="button"
                  onClick={() => setActiveIndex(open ? null : index)}
                  className="flex w-full items-center justify-between text-left text-sm font-semibold"
                >
                  {item.q}
                  <span className="text-zinc-400">{open ? '-' : '+'}</span>
                </button>
                <AnimatePresence>
                  {open && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 text-sm text-zinc-300"
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

const FinalCTA = () => (
  <section className="py-24">
    <div className="mx-auto max-w-5xl px-6">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/40 via-blue-600/20 to-black p-10 text-center"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_60%)]" />
        <div className="relative space-y-6">
          <h2 className="text-3xl font-semibold tracking-[0.01em] sm:text-4xl">
            Your highest score starts today.
          </h2>
          <p className="text-sm text-zinc-200 sm:text-base">
            Join thousands of students mastering their Bac with clarity and
            confidence.
          </p>
          <GlassButton to="/register">Start Free Trial</GlassButton>
        </div>
      </motion.div>
    </div>
  </section>
)

const Footer = () => (
  <footer className="border-t border-white/10 py-12">
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center text-sm text-zinc-400 md:flex-row md:justify-between md:text-left">
      <div>
        <p className="text-lg font-semibold text-white">BacTracker</p>
        <p className="mt-2 text-xs text-zinc-500">
          Built for premium Bac performance.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs uppercase tracking-[0.2em]">
        <span>Features</span>
        <span>Pricing</span>
        <span>Contact</span>
      </div>
      <p className="text-xs text-zinc-500">© 2026 BacTracker</p>
    </div>
  </footer>
)

const LandingPage = () => {
  return (
    <div className="bg-zinc-950 text-white overflow-x-hidden">
      <Hero />
      <Features />
      <AISection />
      <ProductPreview />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}

export default LandingPage
