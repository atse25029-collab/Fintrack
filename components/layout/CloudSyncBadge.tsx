'use client';

import React, { useState, useEffect } from 'react';
import {
  getFirebaseSyncStatus,
  subscribeToFirebaseSyncStatus,
  FirebaseSyncStatus,
} from '@/lib/firebase/realtimeSync';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { Cloud, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface CloudSyncBadgeProps {
  onForceSync?: () => void;
}

export default function CloudSyncBadge({ onForceSync }: CloudSyncBadgeProps) {
  const [status, setStatus] = useState<FirebaseSyncStatus>(getFirebaseSyncStatus());
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    setIsConfigured(isFirebaseConfigured());
    const unsubscribe = subscribeToFirebaseSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  if (!isConfigured) return null;

  return (
    <button
      onClick={onForceSync}
      type="button"
      className="flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded-lg text-[10px] sm:text-[11px] font-mono text-zinc-700 transition-colors shadow-2xs cursor-pointer"
      title={`Firebase Cloud Firestore: ${status.toUpperCase()} (Click to push full backup)`}
    >
      {status === 'synced' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <Cloud className="w-3 h-3 text-emerald-600 hidden sm:inline" />
          <span className="text-zinc-600 hidden sm:inline">Firebase Synced</span>
        </>
      )}

      {status === 'syncing' && (
        <>
          <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
          <span className="text-blue-600 hidden sm:inline font-semibold">Syncing</span>
        </>
      )}

      {status === 'offline' && (
        <>
          <CloudOff className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-400 hidden sm:inline">Offline</span>
        </>
      )}

      {status === 'error' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-amber-600 hidden sm:inline">Retry</span>
        </>
      )}
    </button>
  );
}
