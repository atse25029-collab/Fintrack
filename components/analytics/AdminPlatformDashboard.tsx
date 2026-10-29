'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Users,
  Receipt,
  IndianRupee,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  Clock,
  Star,
  Smartphone,
  Globe,
  Loader2,
  Tag,
} from 'lucide-react';
import {
  fetchSuperAdminPlatformStats,
  fetchAllFeedbacksForAdmin,
  updateFeedbackStatus,
  UserFeedback,
} from '@/lib/supabase/dbService';
import { formatCurrency } from '@/lib/utils';

export default function AdminPlatformDashboard() {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalTransactions: number;
    grossTransactionVolume: number;
    totalFeedbacks: number;
    pendingDuesAcrossSystem: number;
  } | null>(null);

  const [feedbacks, setFeedbacks] = useState<UserFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'unread' | 'reviewed'>('all');
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      const [statsData, feedbackList] = await Promise.all([
        fetchSuperAdminPlatformStats(),
        fetchAllFeedbacksForAdmin(),
      ]);
      if (statsData) setStats(statsData);
      setFeedbacks(feedbackList);
    } catch (err) {
      console.warn('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const handleToggleStatus = async (item: UserFeedback) => {
    const nextStatus = item.status === 'unread' ? 'reviewed' : 'unread';
    setStatusUpdatingId(item.id);
    const ok = await updateFeedbackStatus(item.id, nextStatus);
    setStatusUpdatingId(null);
    if (ok) {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: nextStatus } : f))
      );
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    if (feedbackFilter === 'unread') return f.status === 'unread';
    if (feedbackFilter === 'reviewed') return f.status === 'reviewed';
    return true;
  });

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-950" />
        <span className="text-xs font-mono text-zinc-500">Loading Super Admin Metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-zinc-900 to-black text-white rounded-2xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">Super Admin Platform Overview</h2>
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold rounded-full border border-amber-400/30">
                PROD
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              Authorized as: smohamedfarook2024@gmail.com
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* High-Level Platform Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-zinc-950">
            {stats?.totalUsers || 1}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">Multi-tenant Accounts</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider">System Transactions</span>
            <Receipt className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-zinc-950">
            {stats?.totalTransactions || 0}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">Gross Database Entries</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider">Platform Gross Flow</span>
            <IndianRupee className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-zinc-950">
            {formatCurrency(stats?.grossTransactionVolume || 0)}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">INR Total Ledger</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider">User Feedbacks</span>
            <MessageSquare className="w-4 h-4 text-zinc-700" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-zinc-950">
            {feedbacks.length}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono">
            {feedbacks.filter((f) => f.status === 'unread').length} Unread
          </span>
        </div>
      </div>

      {/* User Feedback Management Inbox */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-zinc-900" />
            <h3 className="text-xs sm:text-sm font-bold text-zinc-950">User Feedback & Inquiries</h3>
            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-mono rounded-full font-bold">
              {feedbacks.length}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-mono">
            <button
              type="button"
              onClick={() => setFeedbackFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                feedbackFilter === 'all' ? 'bg-white text-black shadow-2xs font-bold' : 'text-zinc-500'
              }`}
            >
              All ({feedbacks.length})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter('unread')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                feedbackFilter === 'unread' ? 'bg-white text-black shadow-2xs font-bold' : 'text-zinc-500'
              }`}
            >
              Unread ({feedbacks.filter((f) => f.status === 'unread').length})
            </button>
            <button
              type="button"
              onClick={() => setFeedbackFilter('reviewed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                feedbackFilter === 'reviewed' ? 'bg-white text-black shadow-2xs font-bold' : 'text-zinc-500'
              }`}
            >
              Reviewed ({feedbacks.filter((f) => f.status === 'reviewed').length})
            </button>
          </div>
        </div>

        {filteredFeedbacks.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs font-mono">
            No feedback found in this view.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredFeedbacks.map((item) => {
              const isUnread = item.status === 'unread';
              const isUpdating = statusUpdatingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isUnread
                      ? 'bg-amber-50/40 border-amber-200/80 shadow-2xs'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900">{item.userEmail}</span>
                      
                      {/* Category Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-medium ${
                          item.category === 'feature_request'
                            ? 'bg-blue-100 text-blue-800'
                            : item.category === 'bug_report'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-200 text-zinc-800'
                        }`}
                      >
                        {item.category === 'feature_request'
                          ? '💡 Feature Request'
                          : item.category === 'bug_report'
                          ? '🐛 Bug Report'
                          : '⭐ General'}
                      </span>

                      {/* Platform Tag */}
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-200/70 text-zinc-700 text-[9px] font-mono rounded">
                        {item.platform === 'android_apk' ? (
                          <>
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>Android APK</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-2.5 h-2.5" />
                            <span>Web</span>
                          </>
                        )}
                      </span>

                      {/* Star Rating */}
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              item.rating >= s ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                          isUnread
                            ? 'bg-black text-white hover:bg-zinc-800 border-black'
                            : 'bg-white text-zinc-600 hover:text-black border-zinc-300'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isUnread ? (
                          'Mark Reviewed'
                        ) : (
                          'Mark Unread'
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-zinc-800 leading-relaxed font-sans bg-white/70 p-2.5 rounded-lg border border-zinc-200/60">
                    {item.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
