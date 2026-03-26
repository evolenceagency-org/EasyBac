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
          whileHover={{ scale: 1.01, x: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className={cn(
            'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ease-out',
            variant === 'donate'
              ? cn(
                  'bg-gradient-to-r from-emerald-400/14 to-green-500/14 text-white shadow-[0_8px_18px_rgba(34,197,94,0.12)]',
                  'transition-all duration-200 hover:shadow-[0_10px_20px_rgba(34,197,94,0.16)]',
                  isActive && 'from-emerald-500/35 to-green-600/35'
                )
              : isActive
                ? 'bg-gradient-to-r from-purple-500/18 to-blue-500/18 text-white shadow-[0_8px_18px_rgba(139,92,246,0.14)] border border-white/8'
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
              'flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white transition-all duration-200 ease-out group-hover:translate-x-0.5',
              variant === 'donate'
                ? 'bg-emerald-500/12 text-emerald-200'
                : isActive &&
                  'text-purple-300',
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
                transition={{ duration: 0.18 }}
                className="whitespace-nowrap"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {!collapsed && badge && (
            <span className="ml-auto rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/75">
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

