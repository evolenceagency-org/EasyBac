import { NavLink } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const cn = (...classes) => classes.filter(Boolean).join(' ')

const NavItem = ({ to, icon: Icon, label, collapsed, onClick, variant, badge }) => {
  return (
    <NavLink to={to} onClick={onClick} className="relative block">
      {({ isActive }) => {
        const styles = isActive
          ? 'border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.12)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.15)]'
          : 'border-transparent bg-transparent text-white/80 hover:bg-white/[0.05] hover:text-white'

        const itemClass = cn(
          'group relative flex h-10 items-center rounded-[10px] border text-[13px] font-medium transition-[background-color,border-color,box-shadow] duration-200 ease-out',
          collapsed ? 'mx-auto w-10 justify-center px-0' : 'w-full gap-3 px-3',
          variant === 'donate' && isActive
            ? 'border-[rgba(139,92,246,0.4)] bg-[rgba(139,92,246,0.12)] text-white shadow-[0_0_0_1px_rgba(139,92,246,0.15)]'
            : styles
        )

        return (
          <motion.div
            whileTap={{ scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={itemClass}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-transparent text-white/88 transition-colors duration-200 ease-out',
                isActive && 'text-white',
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
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>

            {!collapsed && badge && (
              <span className="ml-auto rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/75">
                {badge}
              </span>
            )}

            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-3 rounded-[6px] border border-white/[0.08] bg-[#111111] px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition-opacity duration-200 group-hover:opacity-100">
                {label}
              </span>
            )}
          </motion.div>
        )
      }}
    </NavLink>
  )
}

export default NavItem
