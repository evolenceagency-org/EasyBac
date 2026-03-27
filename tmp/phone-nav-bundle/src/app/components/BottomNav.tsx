import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Home, BookOpen, Flame, ListTodo, Settings } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/study", label: "Study", icon: BookOpen },
  { path: "/tasks", label: "Tasks", icon: Flame },
  { path: "/analytics", label: "Analytics", icon: ListTodo },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-50 flex justify-center px-4 pointer-events-none">
      <div className="relative w-full max-w-md pointer-events-auto">
        <div className="relative h-[68px] overflow-visible rounded-full border border-[rgba(139,92,246,0.45)] bg-[rgba(10,10,15,0.85)] shadow-[0_10px_30px_rgba(0,0,0,0.4),0_0_12px_rgba(139,92,246,0.15)] backdrop-blur-[20px]">
          <div className="flex h-full items-center justify-around px-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.button
                  key={item.path}
                  type="button"
                  aria-label={item.label}
                  onClick={() => navigate(item.path)}
                  whileTap={{ scale: 0.97 }}
                  animate={{
                    y: isActive ? -4 : 0,
                    scale: isActive ? 1.05 : 1,
                    opacity: isActive ? 1 : 0.6,
                  }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full"
                >
                  <Icon
                    className={`h-6 w-6 transition-[color,opacity] duration-300 ${
                      isActive ? "text-[#c084fc]" : "text-white/80"
                    }`}
                    strokeWidth={2.35}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
