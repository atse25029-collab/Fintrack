'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  X,
  LogIn,
  UserPlus,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  KeyRound,
  LogOut,
  User,
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  getAuthIdToken,
  isUserAdmin,
} from '@/lib/firebase/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onAuthSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [jwtSnippet, setJwtSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const user = await loginWithGoogle();
      if (user) {
        setSuccess(`Welcome, ${user.displayName || user.email}!`);
        const token = await getAuthIdToken();
        if (token) {
          setJwtSnippet(`${token.slice(0, 18)}...${token.slice(-10)}`);
        }
        onAuthSuccess?.();
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (emailMode === 'signin') {
        const user = await loginWithEmail(email, password);
        if (user) {
          setSuccess('Signed in successfully!');
          onAuthSuccess?.();
          setTimeout(() => onClose(), 1200);
        }
      } else {
        const user = await registerWithEmail(email, password);
        if (user) {
          setSuccess('Account created! Your ledger will sync to your isolated cloud space.');
          onAuthSuccess?.();
          setTimeout(() => onClose(), 1500);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setSuccess('Signed out of account.');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setError(err?.message || 'Sign-out failed');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser ? isUserAdmin(currentUser) : false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.16 }}
          className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-zinc-950 text-white flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight">FinTrack Authentication</h2>
                <p className="text-[11px] text-zinc-400 font-mono">JWT &amp; Multi-Tenant Cloud</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Session Status (If logged in) */}
          {currentUser && !currentUser.isAnonymous ? (
            <div className="p-5 space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-900">Signed In</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isAdmin
                        ? 'bg-black text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-200 text-zinc-800'
                    }`}
                  >
                    {isAdmin ? 'SUPER ADMIN' : 'BETA TESTER'}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 font-mono truncate pt-1 border-t border-zinc-200">
                  UID: {currentUser.uid}
                </p>
              </div>

              {jwtSnippet && (
                <div className="p-2.5 bg-zinc-100 rounded-xl border border-zinc-200 text-[10px] font-mono text-zinc-700 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-zinc-900 shrink-0" />
                  <span className="truncate">Active JWT: {jwtSnippet}</span>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Sign-in Options */
            <div className="p-5 space-y-4">
              {/* Feedback messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              {/* Primary 1-Tap Google Sign-In */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-2xl flex items-center justify-center gap-3 text-xs font-bold text-zinc-900 shadow-xs transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {/* Google SVG G-Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                    />
                  </svg>
                  <span>Continue with Google (1-Tap)</span>
                </button>
                <p className="text-[10px] text-zinc-500 text-center font-mono">
                  Recommended for instant multi-device sync
                </p>
              </div>

              {/* Or divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-zinc-200 w-full" />
                <span className="bg-white px-2 text-[10px] font-mono text-zinc-400 uppercase">
                  or email login
                </span>
              </div>

              {/* Toggle Sign In / Create Account */}
              <div className="grid grid-cols-2 p-1 bg-zinc-100 rounded-xl text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => setEmailMode('signin')}
                  className={`py-1.5 rounded-lg transition-all ${
                    emailMode === 'signin'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setEmailMode('signup')}
                  className={`py-1.5 rounded-lg transition-all ${
                    emailMode === 'signup'
                      ? 'bg-black text-white shadow-xs'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tester@example.com"
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Password</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-1 focus:ring-black focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {emailMode === 'signin' ? (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with Password</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Create Free Account</span>
                    </>
                  )}
                </button>
              </form>

              {/* Multi-Tenant Security & Isolation Notice */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-1 text-zinc-600 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-zinc-900">
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                  <span>Strict Data Isolation</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  Your expenses, monthly dues, and debt tabs are private and cryptographically restricted to your account via Firestore Security Rules.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
