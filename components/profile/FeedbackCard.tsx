'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Star, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitUserFeedback } from '@/lib/supabase/dbService';

export default function FeedbackCard() {
  const [category, setCategory] = useState<'feature_request' | 'bug_report' | 'general'>('general');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setFeedbackStatus({ type: 'error', text: 'Please enter your thoughts or report.' });
      return;
    }

    setSubmitting(true);
    setFeedbackStatus(null);

    const res = await submitUserFeedback({
      category,
      rating,
      message: message.trim(),
    });

    setSubmitting(false);

    if (res.success) {
      setFeedbackStatus({
        type: 'success',
        text: 'Thank you! Your feedback has been sent directly to the FinTrack super admin.',
      });
      setMessage('');
      setTimeout(() => setFeedbackStatus(null), 5000);
    } else {
      setFeedbackStatus({
        type: 'error',
        text: res.error || 'Failed to submit feedback. Check your network connection.',
      });
    }
  };

  const categories = [
    { id: 'general', label: '⭐ General' },
    { id: 'feature_request', label: '💡 Feature Request' },
    { id: 'bug_report', label: '🐛 Bug Report' },
  ];

  return (
    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-zinc-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="p-2 bg-zinc-100 rounded-xl text-black">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-zinc-950">App Feedback & Support</h3>
          <p className="text-[10px] sm:text-xs text-zinc-500">
            Share ideas, report bugs, or rate your experience directly with the admin
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 pt-1">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as any)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all cursor-pointer ${
                category === c.id
                  ? 'bg-black text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* 5-Star Rating Selector */}
        <div className="flex items-center gap-2 py-1">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Rating:</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating !== null ? hoverRating : rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-115 transition-transform cursor-pointer focus:outline-none"
                  aria-label={`${star} Stars`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      active ? 'text-amber-500 fill-amber-500' : 'text-zinc-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-mono font-bold text-zinc-700 ml-1">
            {hoverRating !== null ? hoverRating : rating}/5
          </span>
        </div>

        {/* Message Input */}
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you love, what to improve, or report any issue..."
          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-950 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
        />

        {/* Feedback Alert Status */}
        <AnimatePresence>
          {feedbackStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${
                feedbackStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {feedbackStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              )}
              <span>{feedbackStatus.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Send Feedback</span>
          </button>
        </div>
      </form>
    </div>
  );
}
