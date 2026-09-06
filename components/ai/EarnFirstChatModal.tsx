'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  WeeklySafeSpendState,
  WeeklySafeSpendConfig,
  ChatMessage,
  WeeklySafeSpendChatContext,
  WalletBalances,
  MonthlyDue,
  TabItem,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Key,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Lock,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface EarnFirstChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: WeeklySafeSpendState;
  config: WeeklySafeSpendConfig;
  onUpdateConfig: (newConfig: WeeklySafeSpendConfig) => void;
  wallets: WalletBalances;
  dues: MonthlyDue[];
  tabs?: TabItem[];
}

export default function EarnFirstChatModal({
  isOpen,
  onClose,
  state,
  config,
  onUpdateConfig,
  wallets,
  dues = [],
  tabs = [],
}: EarnFirstChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(config.geminiApiKey || '');
  const [keySavedToast, setKeySavedToast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggested prompt chips
  const SUGGESTED_CHIPS = [
    'Can I afford a ₹250 meal tonight?',
    'How is my week shaping up?',
    'Break down my locked dues & debts',
    'Can I take tomorrow off?',
  ];

  // Initialize greeting on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const todayName = dayNames[new Date().getDay()];
      const safeLeft = Math.max(0, state.remainingSafeToday);

      const greeting: ChatMessage = {
        id: `msg-greet-${Date.now()}`,
        role: 'assistant',
        content: `Hey! I'm your FinTrack Copilot 👋\n\nHappy ${todayName}! Here's your real-time situation:\n• **Safe to spend today:** ₹${safeLeft}\n• **Total Liquid Cash:** ₹${state.totalLiquidFunds} (Cash + Bank)\n• **Locked for bills & debts:** ₹${state.totalObligationsLocked} (${state.pendingDuesCount} dues, ${state.pendingTabsCount} tabs)\n• **Work progress:** ${state.shiftsCompletedThisWeek} of ${state.plannedWorkShiftsThisWeek} shifts completed\n\nWhat's on your mind? Ask me if you can afford something, how to pace your week, or if you can take time off!`,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
    }
  }, [isOpen, state, messages.length]);

  // Keep API key state synchronized with config
  useEffect(() => {
    setTempApiKey(config.geminiApiKey || '');
  }, [config.geminiApiKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const dayOfWeekStr = dayNames[new Date().getDay()];

      const chatContext: WeeklySafeSpendChatContext = {
        date: state.date,
        dayOfWeek: dayOfWeekStr,
        remainingSafeToday: state.remainingSafeToday,
        dailyTargetToday: state.dailyTargetToday,
        spentToday: state.spentToday,
        isOverspentToday: state.isOverspentToday,
        overspentAmount: state.overspentAmount,
        netWeeklySafePool: state.netWeeklySafePool,
        daysRemainingInWeek: state.daysRemainingInWeek,
        totalLiquidFunds: state.totalLiquidFunds,
        wallets: {
          cashInHand: wallets.cashInHand,
          accountBalance: wallets.accountBalance,
        },
        workSchedule: {
          expectedWagePerShift: config.expectedWagePerShift,
          plannedWorkShiftsThisWeek: config.plannedWorkShiftsThisWeek,
          shiftsCompletedThisWeek: state.shiftsCompletedThisWeek,
          shiftsRemainingThisWeek: state.shiftsRemainingThisWeek,
          earnedThisWeek: state.earnedThisWeek,
          remainingExpectedIncome: state.remainingExpectedIncome,
        },
        obligations: {
          totalLocked: state.totalObligationsLocked,
          pendingDuesCount: state.pendingDuesCount,
          pendingDuesTotal: state.pendingDuesTotal,
          pendingDues: state.pendingDuesList.map((d) => ({
            title: d.title,
            amount: d.amount,
            dueDayOfMonth: d.dueDayOfMonth,
            category: d.category,
          })),
          pendingTabsCount: state.pendingTabsCount,
          pendingTabsTotal: state.pendingTabsTotal,
          tabsYouOwe: tabs
            .filter((t) => t.status !== 'settled' && t.type === 'you_owe')
            .map((t) => ({
              personName: t.personName,
              amount: Number(t.amount) || 0,
              description: t.description,
            })),
          tabsOwedToYou: tabs
            .filter((t) => t.status !== 'settled' && t.type === 'owed_to_you')
            .map((t) => ({
              personName: t.personName,
              amount: Number(t.amount) || 0,
              description: t.description,
            })),
        },
      };

      const res = await fetch('/api/ai/earn-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: chatContext,
          customApiKey: config.geminiApiKey || undefined,
        }),
      });

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply ||
          "I'm keeping an eye on your numbers! Let's make sure your upcoming bills and debts stay protected.",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content:
          '⚠️ Could not reach the Copilot right now. Please check your network connection or verify your API key.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = () => {
    const updated = {
      ...config,
      geminiApiKey: tempApiKey.trim(),
    };
    onUpdateConfig(updated);
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setShowKeyConfig(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-zinc-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-black text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-zinc-950">FinTrack Copilot</h3>
                <span className="px-1.5 py-0.2 bg-zinc-200/70 text-[9px] font-mono font-bold text-zinc-700 rounded-md">
                  Gemini 2.5
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Your Street-Smart Financial Partner</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className={`p-2 rounded-xl text-xs flex items-center gap-1 transition-colors ${
                config.geminiApiKey
                  ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                  : 'text-zinc-500 hover:text-black hover:bg-zinc-200/60'
              }`}
              title="Configure dedicated Google AI Studio API Key"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">
                {config.geminiApiKey ? 'Key Active' : 'API Key'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-black hover:bg-zinc-200/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Key Configuration Drawer */}
        {showKeyConfig && (
          <div className="p-3.5 bg-zinc-100/90 border-b border-zinc-200 space-y-2.5 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-black" />
                <span>Dedicated Google AI Studio Free Key</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
              >
                <span>Get Free Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Paste your own free Gemini API key from Google AI Studio so conversations never share or
              hit rate limits.
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-zinc-300 text-xs font-mono focus:outline-hidden focus:border-black"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-black text-white rounded-xl font-medium text-xs hover:bg-zinc-800 transition-colors shrink-0"
              >
                {keySavedToast ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved!</span>
                  </span>
                ) : (
                  'Save Key'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Live Context Badges Strip */}
        <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-3 overflow-x-auto py-0.5 scrollbar-none">
            <span className="text-zinc-600 shrink-0">
              Safe Left:{' '}
              <strong
                className={
                  state.remainingSafeToday < 0
                    ? 'text-red-600'
                    : state.remainingSafeToday === 0
                    ? 'text-amber-600'
                    : 'text-zinc-950'
                }
              >
                {formatCurrency(Math.max(0, state.remainingSafeToday))}
              </strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600 shrink-0">
              Liquid: <strong className="text-black">{formatCurrency(state.totalLiquidFunds)}</strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600 shrink-0">
              Locked:{' '}
              <strong className="text-red-600">
                -{formatCurrency(state.totalObligationsLocked)}
              </strong>
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-zinc-600 shrink-0">
              Shifts:{' '}
              <strong className="text-zinc-900">
                {state.shiftsCompletedThisWeek}/{state.plannedWorkShiftsThisWeek}
              </strong>
            </span>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3 sm:p-3.5 space-y-1.5 ${
                    isUser
                      ? 'bg-black text-white rounded-br-xs'
                      : 'bg-zinc-100/90 text-zinc-900 border border-zinc-200/80 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.content}
                  </div>
                  <span
                    className={`text-[9px] block text-right font-mono ${
                      isUser ? 'text-zinc-400' : 'text-zinc-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-zinc-200 text-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-100 rounded-2xl p-3 border border-zinc-200/80 flex items-center gap-1.5 text-zinc-500 text-xs">
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
                <span className="ml-1 text-[11px] font-mono">Thinking &amp; analyzing your cash...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Chips */}
        <div className="px-4 py-2 border-t border-zinc-100 bg-white/50 flex gap-1.5 overflow-x-auto scrollbar-none">
          {SUGGESTED_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(chip)}
              disabled={isLoading}
              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-800 rounded-xl text-[11px] shrink-0 transition-colors active:scale-95 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Message Input Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="e.g. Can I afford a ₹250 meal tonight?"
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-300 rounded-2xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-black focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2.5 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white rounded-2xl transition-all active:scale-95 shrink-0"
              title="Send question"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
