import { motion } from 'framer-motion'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for getting your first streak running.',
    features: ['Study timer', 'Basic analytics', 'Task tracking']
  },
  {
    name: 'Pro',
    price: '$9/mo',
    description: 'Unlock full analytics and AI assistance.',
    features: ['Unlimited sessions', 'AI insights', 'Advanced analytics'],
    highlight: true
  },
  {
    name: 'Elite',
    price: '$19/mo',
    description: 'Built for intense exam preparation cycles.',
    features: ['Everything in Pro', 'Priority support', 'Custom plans']
  }
]

const PricingTeaser = () => {
  return (
    <section id="pricing" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
            Pricing
          </p>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
            Choose your momentum
          </h2>
          <p className="mt-3 text-sm text-zinc-300">
            Start with free access, upgrade when you want deeper analytics.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={`glass rounded-2xl p-6 shadow-lg ${
                plan.highlight
                  ? 'border border-emerald-400/50 bg-gradient-to-br from-emerald-500/10 to-transparent'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {plan.highlight && (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-200">
                    Most Popular
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-semibold">{plan.price}</p>
              <p className="mt-2 text-sm text-zinc-300">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <button className="mt-6 w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30">
                Choose {plan.name}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default PricingTeaser
