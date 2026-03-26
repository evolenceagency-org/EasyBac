import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const FinalCTA = () => {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/4 p-8 text-center backdrop-blur-lg md:p-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-400/10 to-transparent" />
          <div className="relative space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Start your free trial today
            </h2>
            <p className="text-sm leading-6 text-zinc-300 sm:text-[15px]">
              Join thousands of students building consistent, high-impact study
              routines.
            </p>
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-7 py-3 text-sm font-semibold text-zinc-900 shadow-[0_10px_20px_rgba(74,225,118,0.18)] transition hover:scale-[1.02]"
            >
              Start Free Trial
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default FinalCTA
