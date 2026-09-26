'use client';

import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Users, Calendar, BarChart3, User } from 'lucide-react';
import { AppSection } from './Header';

interface BottomNavProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  dueAlertCount?: number;
}

export default function BottomNav({
  currentSection,
  onSelectSection,
  dueAlertCount = 0,
}: BottomNavProps) {
  const navItems = [
    {
      id: 'daily' as AppSection,
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'tabs' as AppSection,
      label: 'Tabs',
      icon: Users,
    },
    {
      id: 'dues' as AppSection,
      label: 'Dues',
      icon: Calendar,
      badge: dueAlertCount,
    },
    {
      id: 'analytics' as AppSection,
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      id: 'profile' as AppSection,
      label: 'Profile',
      icon: User,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-zinc-200 shadow-lg px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelectSection(item.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl cursor-pointer ${
                isActive ? 'text-black' : 'text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {/* Icon Container with active sliding pill */}
              <div className="relative p-1.5 rounded-xl">
                {isActive && (
                  <motion.div
                    layoutId="activeBottomNavPill"
                    className="absolute inset-0 bg-zinc-100 rounded-xl shadow-xs"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}

                <div className="relative z-10 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />

                  {/* Overdue / Due alert dot */}
                  <AnimatePresence>
                    {item.badge && item.badge > 0 ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex items-center justify-center rounded-full h-3 w-3 bg-red-600 text-white text-[9px] font-bold">
                          {item.badge}
                        </span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-0.5 font-medium transition-colors relative z-10 ${
                  isActive ? 'text-black font-bold' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
