import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }) => {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className="relative block"
    >
      {({ isActive }) => (
        <motion.div
          whileHover={{ scale: 1.03 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-out',
            isActive
              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] scale-[1.05]'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white hover:shadow-[0_0_20px_rgba(139,92,246,0.18)]'
          )}
        >
          <span
            className={cn(
              'absolute left-0 top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-purple-400 to-blue-400 transition',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
          />
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-white transition-all duration-300 ease-out group-hover:translate-x-1',
              isActive &&
                'text-purple-300 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]',
              collapsed && 'mx-auto'
            )}
          >
            <Icon className="h-4.5 w-4.5" />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {collapsed && (
            <span className="pointer-events-none absolute left-full ml-3 rounded-md bg-black/80 px-2 py-1 text-xs text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
              {label}
            </span>
          )}
        </motion.div>
      )}
    </NavLink>
  )
}

export default NavItem
