import { NavLink } from 'react-router-dom'

const links = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Study', path: '/study' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Analytics', path: '/analytics' }
]

const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-64 flex-col gap-8 border-r border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl transition-transform md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            EasyBac
          </p>
          <h1 className="mt-2 text-xl font-semibold">Study Command</h1>
          <p className="mt-1 text-sm text-zinc-400">Moroccan Bac 2026</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white text-zinc-900'
                    : 'text-zinc-200 hover:bg-white/10'
                }`
              }
            >
              <span>{link.label}</span>
              <span className="text-xs text-zinc-400">?</span>
            </NavLink>
          ))}
        </nav>

        <div className="glass rounded-2xl p-4 text-xs text-zinc-300">
          <p className="font-semibold text-white">Focus Tip</p>
          <p className="mt-1 text-zinc-400">
            Study in 45 minute sprints. Log breaks to keep the streak alive.
          </p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
