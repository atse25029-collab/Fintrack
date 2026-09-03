'use client';

import React, { useState, useEffect } from 'react';
import NativeInstallButton from '@/components/pwa/NativeInstallButton';
import {
  Target,
  Database,
  Plus,
  ChevronDown,
  LayoutDashboard,
  Users,
  Calendar,
  BarChart3,
  Clock,
  User,
} from 'lucide-react';

export type AppSection = 'daily' | 'tabs' | 'dues' | 'analytics' | 'profile';

interface HeaderProps {
  currentSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenAddModal: () => void;
  onOpenBudgetModal: () => void;
  onOpenExportModal: () => void;
  dueAlertCount?: number;
}

export default function Header({
  currentSection,
  onSelectSection,
  onOpenAddModal,
  onOpenBudgetModal,
  onOpenExportModal,
  dueAlertCount = 0,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [liveTime, setLiveTime] = useState<string>('');

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
    { id: 'daily', label: 'Daily Finance', icon: LayoutDashboard },
    { id: 'tabs', label: 'Tabs (Lent & Borrowed)', icon: Users },
    { id: 'dues', label: 'Monthly Dues', icon: Calendar, alert: dueAlertCount },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile & Cloud Sync', icon: User },
  ];

  const activeSectionObj = sections.find((s) => s.id === currentSection) || sections[0];
  const ActiveIcon = activeSectionObj.icon;

  return (
    <header className="sticky top-0 z-30 bg-[#f4f4f5]/95 backdrop-blur-md border-b border-zinc-200 py-2.5 px-3 sm:px-6 w-full max-w-full overflow-hidden">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3 w-full">
        {/* Left: Brand Logo + Desktop Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm shrink-0">
            <div className="flex items-end gap-0.5 h-3.5 sm:h-4">
              <div className="w-0.5 sm:w-1 bg-white h-1.5 sm:h-2 rounded-full" />
              <div className="w-0.5 sm:w-1 bg-white h-2.5 sm:h-3 rounded-full" />
              <div className="w-0.5 sm:w-1 bg-white h-3.5 sm:h-4 rounded-full" />
            </div>
          </div>

          {/* Desktop Section Dropdown Switcher */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 hover:border-black rounded-xl shadow-sm text-xs font-semibold text-zinc-950 transition-all group"
            >
              <ActiveIcon className="w-3.5 h-3.5 text-black" />
              <span>{activeSectionObj.label}</span>
              {activeSectionObj.alert ? (
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              ) : null}
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-black transition-transform" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-zinc-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Switch Section
                  </div>
                  {sections.map((sec) => {
                    const Icon = sec.icon;
                    const isActive = currentSection === sec.id;
                    return (
                      <button
                        key={sec.id}
                        onClick={() => {
                          onSelectSection(sec.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                          isActive
                            ? 'bg-zinc-100 text-black font-semibold'
                            : 'text-zinc-700 hover:bg-zinc-50 hover:text-black'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-black" />
                          <span>{sec.label}</span>
                        </div>
                        {sec.alert && sec.alert > 0 ? (
                          <span className="px-1.5 py-0.2 bg-black text-white text-[10px] font-mono rounded font-bold">
                            {sec.alert} Due
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Mobile Brand Name */}
          <span className="md:hidden text-xs font-mono font-bold uppercase tracking-wider text-black truncate">
            FinTrack
          </span>

          {/* Real-Time Live Clock Badge (Tablet & Desktop) */}
          {liveTime && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-zinc-200/70 border border-zinc-300 rounded-lg text-[10px] sm:text-[11px] font-mono text-zinc-700 shrink-0">
              <Clock className="w-3 h-3 text-zinc-900 shrink-0" />
              <span>{liveTime}</span>
            </div>
          )}
        </div>

        {/* Right Nav Actions: Scaled for mobile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <NativeInstallButton />

          <button
            onClick={onOpenBudgetModal}
            aria-label="Set Budget"
            title="Set Budget Limits (₹)"
            className="p-1.5 sm:p-2 text-zinc-700 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors shrink-0"
          >
            <Target className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenExportModal}
            aria-label="Data Backup"
            title="CSV Export &amp; Backup"
            className="p-1.5 sm:p-2 text-zinc-700 hover:text-black rounded-lg hover:bg-zinc-200 transition-colors shrink-0"
          >
            <Database className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 transition-all shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-xs">Log</span>
          </button>
        </div>
      </div>
    </header>
  );
}
