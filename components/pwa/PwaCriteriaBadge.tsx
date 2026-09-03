'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CheckCircle2 } from 'lucide-react';

export default function PwaCriteriaBadge() {
  const [isOnline, setIsOnline] = useState(true);
  const [swActive, setSwActive] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setSwActive(true);
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-zinc-500">
      <div className="flex items-center gap-1 bg-zinc-200/70 px-2 py-0.5 rounded border border-zinc-300">
        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
      </div>

      <div className="flex items-center gap-1 bg-zinc-200/70 px-2 py-0.5 rounded border border-zinc-300">
        <CheckCircle2 className="w-3 h-3 text-zinc-700" />
        <span>PWA: {swActive ? 'READY' : 'ENABLED'}</span>
      </div>

      <div className="flex items-center gap-1 bg-zinc-200/70 px-2 py-0.5 rounded border border-zinc-300">
        <Cloud className="w-3 h-3 text-zinc-700" />
        <span>VERCEL SYNC</span>
      </div>
    </div>
  );
}
