import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const tabs = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    title: 'Your daily command center',
    description:
      'See study time, streaks, and progress at a glance with a clean overview.',
    image: '/landing-preview.png'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    title: 'Turn plans into action',
    description:
      'Track tasks by subject and keep your day aligned with exam goals.',
    image: '/landing-preview.png'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    title: 'See deeper trends',
    description:
      'Understand focus distribution, creativity, and weekly performance.',
    image: '/landing-preview.png'
  }
]

const ProductPreview = () => {
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="mb-10 flex flex-wrap items-center justify-between gap-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
              Product Preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Experience the workflow
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeTab.id === tab.id
                    ? 'bg-white text-zinc-900'
                    : 'border border-white/10 bg-white/5 text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          >
            <div className="glass rounded-3xl p-5">
              <h3 className="text-lg font-semibold tracking-tight">{activeTab.title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {activeTab.description}
              </p>
            </div>
            <div className="glass overflow-hidden rounded-3xl p-2">
              <img
                src={activeTab.image}
                alt={activeTab.title}
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export default ProductPreview

