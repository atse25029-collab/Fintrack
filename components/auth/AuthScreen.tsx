'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from '@/lib/supabase/dbService';
import {
  getSupabaseUrl,
  getSupabaseAnonKey,
  checkIsSupabaseConfigured,
  setSupabaseCredentials,
} from '@/lib/supabase/client';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  Database,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Runtime Supabase configuration state
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customUrl, setCustomUrl] = useState<string>(getSupabaseUrl());
  const [customKey, setCustomKey] = useState<string>(getSupabaseAnonKey());
  const [configSaving, setConfigSaving] = useState<boolean>(false);

  useEffect(() => {
    const configured = checkIsSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
      setShowConfigModal(true);
    }
  }, []);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setErrorMsg(null);

    const success = setSupabaseCredentials(customUrl, customKey);
    setConfigSaving(false);

    if (success) {
      setIsConfigured(true);
      setShowConfigModal(false);
      setSuccessMsg('Supabase connected successfully! You can now sign in.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } else {
      setErrorMsg('Invalid Supabase configuration. Please enter a valid https:// URL and Anon Key.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIsSupabaseConfigured()) {
      setShowConfigModal(true);
      setErrorMsg('Please configure your Supabase Anon Key first.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await signUpWithEmail(email, password);
        if (error) throw error;
        const authUser = data?.user;
        const authSession = data?.session;

        if (authSession && authUser) {
          setSuccessMsg('Account created successfully! Welcome to FinTrack.');
          setTimeout(() => {
            onAuthSuccess(authUser);
          }, 800);
        } else if (authUser) {
          // Attempt immediate login in case auto-confirmation is active
          try {
            const loginRes = await signInWithEmail(email, password);
            const verifiedUser = loginRes.data?.user;
            if (verifiedUser && loginRes.data?.session) {
              setSuccessMsg('Account created and logged in! Welcome to FinTrack.');
              setTimeout(() => {
                onAuthSuccess(verifiedUser);
              }, 800);
              return;
            }
          } catch {
            // Requires email confirmation
          }
          setSuccessMsg('Account created! Check your email inbox to verify, then sign in.');
          setMode('signin');
        } else {
          setSuccessMsg('Verification link sent! Check your email inbox to verify.');
          setMode('signin');
        }
      } else {
        const { data, error } = await signInWithEmail(email, password);
        if (error) throw error;
        const authUser = data?.user;
        if (authUser) {
          setSuccessMsg('Welcome back!');
          setTimeout(() => {
            onAuthSuccess(authUser);
          }, 600);
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify credentials.';
      setErrorMsg(msg);
      if (msg.includes('Supabase is not configured')) {
        setShowConfigModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!checkIsSupabaseConfigured()) {
      setShowConfigModal(true);
      setErrorMsg('Please configure your Supabase Anon Key first.');
      return;
    }

    setGoogleLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err: any) {
      const msg = err.message || 'Google sign-in could not be initiated.';
      setErrorMsg(msg);
      if (msg.includes('Supabase is not configured')) {
        setShowConfigModal(true);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f4f5] flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md bg-white border border-zinc-200/90 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6"
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

        {/* Feature Pills */}
        <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />
            <span>Private & Encrypted</span>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-900" />
            <span>Dual Web & APK</span>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-zinc-100 p-1 border border-zinc-200">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-white border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-black transition-all shadow-2xs active:scale-[0.98] cursor-pointer disabled:opacity-50"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-zinc-700" />
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
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-zinc-200 w-full" />
          <span className="bg-white px-2 text-[10px] uppercase font-mono text-zinc-400 absolute">
            or email
          </span>
        </div>

        {/* Feedback Alerts */}
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

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-600">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-300 rounded-xl text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-black text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Configuration Modal / Panel */}
        <AnimatePresence>
          {showConfigModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-black" />
                  <span className="text-xs font-bold text-zinc-950">
                    Supabase Database Setup
                  </span>
                </div>
                {isConfigured && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="text-[10px] text-zinc-500 hover:text-black font-semibold px-2 py-0.5 rounded cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Connect your cloud database to sync data and authenticate users across Android & Web.
              </p>

              <form onSubmit={handleSaveConfig} className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-zinc-600 font-semibold">
                    Supabase Project URL
                  </label>
                  <input
                    type="url"
                    required
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://your-project.supabase.co"
                    className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase text-zinc-600 font-semibold">
                      Anon / Publishable API Key
                    </label>
                    <a
                      href="https://supabase.com/dashboard/project/etojohnmcqrpkuqvmkpv/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>Find Key</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="sb_publishable_... or eyJhbGciOi..."
                      className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={configSaving}
                  className="w-full py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  {configSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save &amp; Connect Database</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Currency: ₹ (INR) &bull; Light Theme</span>
          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className="text-zinc-600 hover:text-black underline cursor-pointer text-[10px]"
          >
            {showConfigModal ? 'Hide Config' : 'Database Settings'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
