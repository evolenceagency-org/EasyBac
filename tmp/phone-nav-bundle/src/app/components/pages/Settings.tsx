import { motion } from "motion/react";
import { User, Bell, Shield, Palette, Globe, LogOut } from "lucide-react";

export function Settings() {
  const settingsSections = [
    {
      title: "Account",
      items: [
        { icon: User, label: "Profile", value: "John Doe" },
        { icon: Bell, label: "Notifications", value: "On" },
      ],
    },
    {
      title: "Preferences",
      items: [
        { icon: Palette, label: "Appearance", value: "Dark" },
        { icon: Globe, label: "Language", value: "English" },
      ],
    },
    {
      title: "Security",
      items: [
        { icon: Shield, label: "Privacy", value: "" },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center justify-center min-h-screen"
    >
      <div className="w-full max-w-md px-6">
        {/* Header */}
        <div className="mb-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl mb-2"
          >
            Settings
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/60"
          >
            Manage your preferences
          </motion.p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * sectionIndex }}
            >
              <h3 className="text-sm text-white/50 mb-3 px-1">{section.title}</h3>
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                      style={{
                        borderBottom:
                          itemIndex < section.items.length - 1
                            ? "1px solid rgba(255, 255, 255, 0.05)"
                            : "none",
                      }}
                    >
                      <Icon className="w-5 h-5 text-white/70" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.value && (
                        <span className="text-white/40 text-sm">{item.value}</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Logout Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.98 }}
          className="mt-8 w-full flex items-center justify-center gap-3 p-4 rounded-3xl"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <span className="text-red-400">Log Out</span>
        </motion.button>
      </div>
    </motion.div>
  );
}