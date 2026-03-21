import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <video
          className="h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/landing-preview.png"
          aria-hidden="true"
        >
          <source
            src="https://cdn.coverr.co/videos/coverr-students-studying-5401/1080p.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      <div className="absolute top-0 z-20 w-full">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="text-xl font-semibold text-white">
            BacTracker
          </Link>
          <div className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="#features" className="transition hover:text-white">
              Features
            </a>
            <a href="#pricing" className="transition hover:text-white">
              Pricing
            </a>
            <a href="#how" className="transition hover:text-white">
              How it works
            </a>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/login"
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/30"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:scale-[1.03]"
            >
              Get started
            </Link>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 px-6 pb-24 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
      >
        <div className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-zinc-300"
          >
            Live Bac Countdown
          </motion.div>
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Track Your Bac Progress Like a Pro
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="max-w-xl text-base text-zinc-300 sm:text-lg"
          >
            Measure your study time, track productivity, and stay consistent
            until exam day.
          </motion.p>
          <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 py-3 text-sm font-semibold text-zinc-900 shadow-[0_0_25px_rgba(74,225,118,0.35)] transition hover:scale-[1.03]"
            >
              Start Free Trial
            </Link>
            <button className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-white/30">
              Watch Demo
            </button>
          </motion.div>
        </div>

        <motion.div
          className="hidden lg:block"
          variants={itemVariants}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="relative">
            <div className="glass rounded-3xl p-3 shadow-lg">
              <img
                src="/landing-preview.png"
                alt="BacTracker preview"
                className="rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 glass rounded-2xl px-4 py-3 text-xs text-zinc-200 shadow-lg">
              +24% improvement
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
