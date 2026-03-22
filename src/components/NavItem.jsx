import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const NavItem = ({ to, icon: Icon, label, collapsed, onClick, variant, badge }) => {
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
            'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ease-out',
            variant === 'donate'
              ? cn(
                  'bg-gradient-to-r from-emerald-400/20 to-green-500/20 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)]',
                  'transition-all duration-200 hover:shadow-[0_0_28px_rgba(34,197,94,0.5)]',
                  isActive && 'from-emerald-500/35 to-green-600/35'
                )
              : isActive
                ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white shadow-[0_0_20px_rgba(139,92,246,0.25)] border border-white/10'
                : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          )}
        >
          <span
            className={cn(
              'absolute left-0 top-0 h-full w-[3px] rounded-full bg-gradient-to-b from-purple-400 to-blue-400 transition',
              variant === 'donate'
                ? isActive
                  ? 'opacity-100 from-emerald-300 to-green-400'
                  : 'opacity-0'
                : isActive
                  ? 'opacity-100'
                  : 'opacity-0'
            )}
          />
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white transition-all duration-300 ease-out group-hover:translate-x-1',
              variant === 'donate'
                ? 'bg-emerald-500/15 text-emerald-200 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : isActive &&
                  'text-purple-300 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]',
              collapsed && 'mx-auto'
            )}
          >
            <Icon className="h-5 w-5" />
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

          {!collapsed && badge && (
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80">
              {badge}
            </span>
          )}

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
