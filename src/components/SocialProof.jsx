import { motion } from 'framer-motion'

const logos = [
  'Oxford Academy',
  'Sorbonne Prep',
  'MIT Scholars',
  'Stanford Prep',
  'HEC Paris'
]

const SocialProof = () => {
  return (
    <section className="border-y border-white/5 bg-zinc-950/60 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 text-xs uppercase tracking-[0.3em] text-zinc-400"
      >
        {logos.map((logo) => (
          <span key={logo} className="whitespace-nowrap">
            {logo}
          </span>
        ))}
      </motion.div>
    </section>
  )
}

export default SocialProof
