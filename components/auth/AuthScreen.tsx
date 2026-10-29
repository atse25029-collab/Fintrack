'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithGoogle } from '@/lib/supabase/dbService';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || 'Google sign-in could not be initiated.';
      setErrorMsg(msg);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f4f5] flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center text-white shadow-md mx-auto">
            <div className="flex items-end gap-1 h-5">
              <div className="w-1 bg-white h-2 rounded-full" />
              <div className="w-1 bg-white h-3.5 rounded-full" />
              <div className="w-1 bg-white h-5 rounded-full" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 font-sans">
            FinTrack
          </h1>
          <p className="text-xs text-zinc-500 font-mono tracking-wide uppercase">
            Personal Finance &bull; Daily Ledger
          </p>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
            <span>Private &amp; Cloud Synced</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-900" />
            <span>Dual Web &amp; APK</span>
          </div>
        </div>

        {/* Error Feedback */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Google OAuth Button - Dedicated Primary Action */}
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-zinc-300 rounded-xl text-xs sm:text-sm font-semibold text-zinc-800 hover:bg-zinc-50 hover:text-black hover:border-zinc-400 transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-800" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{googleLoading ? 'Signing in with Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-zinc-500 font-mono pt-1">
          Currency locked to Indian Rupee (₹) &bull; Light Theme
        </p>
      </motion.div>
    </div>
  );
}
