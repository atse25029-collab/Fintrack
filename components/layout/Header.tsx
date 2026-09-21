'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import NativeInstallButton from '@/components/pwa/NativeInstallButton';
import {
  Target,
  Database,
  Plus,
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Clock,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { getStoredTheme, cycleTheme, ThemeMode } from '@/lib/theme/themeService';

import CloudSyncBadge from '@/components/layout/CloudSyncBadge';

export type AppSection = 'daily' | 'tabs' | 'dues' | 'analytics' | 'profile';

interface HeaderProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenAddModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenExportModal: () => void;
  dueAlertCount?: number;
  onForceSync?: () => void;
}

export default function Header({
  currentSection,
  onSelectSection,
  onOpenAddModal,
  onOpenBudgetModal,
  onOpenExportModal,
  dueAlertCount = 0,
  onForceSync,
}: HeaderProps) {
  const [liveTime, setLiveTime] = useState<string>('');
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const sections: { id: AppSection; label: string; icon: any; alert?: number }[] = [
    { id: 'daily', label: 'Home', icon: LayoutDashboard },
    { id: 'tabs', label: 'Tabs', icon: Users },
    { id: 'dues', label: 'Dues', icon: Calendar, alert: dueAlertCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#f4f4f5]/95 backdrop-blur-md border-b border-zinc-200 py-2.5 px-3 sm:px-6 w-full max-w-full">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
        {/* Left: Brand Logo + Brand Name */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm shrink-0">
            <div className="flex items-end gap-0.5 h-3.5 sm:h-4">
              <div className="w-0.5 sm:w-1 bg-white h-1.5 sm:h-2 rounded-full" />
              <div className="w-0.5 sm:w-1 bg-white h-2.5 sm:h-3 rounded-full" />
              <div className="w-0.5 sm:w-1 bg-white h-3.5 sm:h-4 rounded-full" />
            </div>
          </div>

          <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-black">
            FinTrack
          </span>

          {/* Real-Time Live Clock Badge (Tablet & Desktop) */}
          {liveTime && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-zinc-200/70 border border-zinc-300 rounded-lg text-[10px] sm:text-[11px] font-mono text-zinc-700 shrink-0">
              <Clock className="w-3 h-3 text-zinc-900 shrink-0" />
              <span>{liveTime}</span>
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation Bar with Motion Spring Sliding Pill */}
        <nav
          aria-label="Desktop Navigation"
          className="hidden md:flex items-center gap-1 bg-zinc-200/70 p-1 rounded-xl border border-zinc-300/80 shadow-2xs"
        >
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isActive = currentSection === sec.id;

            return (
              <motion.button
                key={sec.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectSection(sec.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive ? 'text-black' : 'text-zinc-500 hover:text-black'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDesktopNavPill"
                    className="absolute inset-0 bg-white rounded-lg shadow-xs border border-zinc-200/80"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-black stroke-[2.5]' : 'text-zinc-500 stroke-[1.8]'
                    }`}
                  />
                  <span>{sec.label}</span>
                  {sec.alert && sec.alert > 0 ? (
                    <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] font-mono rounded-full font-bold">
                      {sec.alert}
                    </span>
                  ) : null}
                </span>
              </motion.button>
            );
          })}
        </nav>

        {/* Right Nav Actions: Scaled for mobile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <CloudSyncBadge onForceSync={onForceSync} />
          <NativeInstallButton />

          {/* AMOLED Theme Switcher */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setTheme(cycleTheme(theme))}
            aria-label="Toggle AMOLED Dark Theme"
            title={`Current: ${theme.toUpperCase()} (Click to toggle)`}
            className="p-1.5 sm:p-2 text-zinc-700 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
          >
            {theme === 'amoled' ? (
              <Moon className="w-4 h-4 text-amber-300 fill-amber-300" />
            ) : theme === 'system' ? (
              <Moon className="w-4 h-4 text-zinc-600" />
            ) : (
              <Sun className="w-4 h-4 text-zinc-800" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={onOpenBudgetModal}
            aria-label="Set Budget"
            title="Set Budget Limits (₹)"
            className="p-1.5 sm:p-2 text-zinc-700 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
          >
            <Target className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={onOpenExportModal}
            aria-label="Data Backup"
            title="CSV Export & Backup"
            className="p-1.5 sm:p-2 text-zinc-700 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors shrink-0 cursor-pointer"
          >
            <Database className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.94 }}
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-xs">Log</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
