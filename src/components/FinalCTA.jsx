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
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-cyan-400/10 to-transparent" />
          <div className="relative space-y-6">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Start your free trial today
            </h2>
            <p className="text-sm text-zinc-300 sm:text-base">
              Join thousands of students building consistent, high-impact study
              routines.
            </p>
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 px-8 py-3 text-sm font-semibold text-zinc-900 shadow-[0_0_25px_rgba(74,225,118,0.35)] transition hover:scale-[1.03]"
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
