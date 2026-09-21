'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Transaction,
  WalletBalances,
  MonthlyDue,
  TabItem,
  BudgetConfig,
  ChatMessage,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  buildFinancialKnowledgeGraph,
  FinancialKnowledgeGraph,
} from '@/lib/ai/knowledgeGraph';
import { ActionProposal } from '@/lib/ai/aiService';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User as UserIcon,
  CheckCircle2,
  Layers,
  Wallet,
  Calendar,
  Users,
  Check,
  RefreshCw,
  KeyRound,
  ExternalLink,
  X,
  Lock,
} from 'lucide-react';

interface AssistantViewProps {
  transactions: Transaction[];
  wallets: WalletBalances;
  dues: MonthlyDue[];
  tabs: TabItem[];
  budget: BudgetConfig;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onSettleTab?: (personName: string, amount?: number) => void;
  onUpdateWallets?: (wallets: WalletBalances) => void;
}

export default function AssistantView({
  transactions,
  wallets,
  dues,
  tabs,
  budget,
  onAddTransaction,
  onSettleTab,
  onUpdateWallets,
}: AssistantViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      role: 'assistant',
      content:
        "Hello! I am your FinTrack Copilot, powered by Google Gemini ✨.\n\nI have real-time access to your personal Financial Knowledge Graph and can also answer ANY general knowledge, coding, math, writing, or everyday questions just like Google Gemini. How can I help you today?",
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [keySavedToast, setKeySavedToast] = useState(false);

  // Voice Input State (Speech-to-Text)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Pending Action Proposals
  const [pendingProposals, setPendingProposals] = useState<ActionProposal[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live Knowledge Graph
  const fkg: FinancialKnowledgeGraph = useMemo(() => {
    return buildFinancialKnowledgeGraph({
      transactions,
      wallets,
      dues,
      tabs,
      budget,
    });
  }, [transactions, wallets, dues, tabs, budget]);

  // Load saved Gemini API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('fintrack_gemini_api_key') || '';
      setApiKey(stored);
      setTempKeyInput(stored);
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, pendingProposals]);

  // Voice Input Toggle
  const toggleVoiceInput = () => {
    if (!speechSupported) {
      alert('Speech Recognition is not supported by your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  // Text-to-Speech Playback
  const speakResponse = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !isAudioFeedbackEnabled) {
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Send message to Gemini / Copilot API
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          provider: 'gemini',
          apiKey: apiKey.trim() || undefined,
          fkgData: {
            transactions,
            wallets,
            dues,
            tabs,
            budget,
          },
        }),
      });

      const data = await res.json();
      if (data.content) {
        const assistantMsg: ChatMessage = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        speakResponse(data.content);

        if (data.actionProposal) {
          setPendingProposals((prev) => [...prev, data.actionProposal]);
        }
      } else {
        throw new Error(data.error || 'No response from assistant');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${err?.message || 'Network error'}. Local knowledge graph fallback is available.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm and apply action proposal
  const handleApplyProposal = (proposal: ActionProposal) => {
    if (proposal.type === 'log_transaction') {
      const p = proposal.payload;
      onAddTransaction({
        type: p.type || 'expense',
        amount: p.amount,
        category: p.category || 'Miscellaneous',
        description: p.description || 'Expense',
        date: p.date || new Date().toISOString().split('T')[0],
        paymentMethod: p.paymentMethod || 'UPI / Bank',
      });
    } else if (proposal.type === 'settle_tab' && onSettleTab) {
      onSettleTab(proposal.payload.personName, proposal.payload.amount);
    }

    setPendingProposals((prev) =>
      prev.map((item) => (item.id === proposal.id ? { ...item, applied: true } : item))
    );
  };

  const starterChips = [
    'How much do I have in hand vs account?',
    'Explain how compound interest works with an example',
    'Who owes me money right now?',
    'Can I afford a ₹1,200 purchase today?',
    'Paid ₹120 for chai in cash',
    'Suggest 5 smart money-saving tips in India',
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-black text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                Financial AI Copilot
              </h2>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-black text-white uppercase">
                Google Gemini
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Full-featured Gemini chatbot with live Financial Knowledge Graph grounding
            </p>
          </div>
        </div>

        {/* Top Controls: Voice Out + Gemini Key Setup */}
        <div className="flex items-center gap-2">
          {/* TTS Toggle */}
          <button
            type="button"
            onClick={() => setIsAudioFeedbackEnabled(!isAudioFeedbackEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isAudioFeedbackEnabled
                ? 'bg-black text-white border-black'
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
            title={isAudioFeedbackEnabled ? 'Mute AI voice speech' : 'Enable AI voice speech'}
          >
            {isAudioFeedbackEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Voice Out</span>
          </button>

          {/* Gemini Key Configuration Button */}
          <button
            type="button"
            onClick={() => {
              setTempKeyInput(apiKey);
              setShowKeyModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              apiKey
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
            }`}
            title="Configure Google Gemini API Key"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                apiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <KeyRound className="w-3.5 h-3.5 text-zinc-700" />
            <span className="font-mono">{apiKey ? 'Gemini Active' : 'Gemini Key'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
        {/* LEFT COLUMN: Financial Knowledge Graph Inspector */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950">
                <Layers className="w-4 h-4 text-black" />
                <span>Active Knowledge Graph</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {fkg.summary.nodeCount} nodes • {fkg.summary.edgeCount} edges
              </span>
            </div>

            {/* Wallets Node Snapshot */}
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-zinc-500" /> Liquid Pool
                </span>
                <span className="font-mono font-bold text-zinc-950">
                  {formatCurrency(fkg.summary.totalLiquid)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-zinc-500 border-t border-zinc-200/60">
                <div>Hand: {formatCurrency(wallets.cashInHand || 0)}</div>
                <div>Acct: {formatCurrency(wallets.accountBalance || 0)}</div>
              </div>
            </div>

            {/* Dues Node Snapshot */}
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" /> Pending Dues
                </span>
                <span className="font-mono font-bold text-zinc-950">
                  {fkg.summary.pendingDuesCount} obligations
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                Total Committed: {formatCurrency(fkg.summary.pendingDuesTotal)}
              </div>
            </div>

            {/* Social Tabs Snapshot */}
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-zinc-500" /> Peer Debt Matrix
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(fkg.summary.receivablesTotal)}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-500">
                You Owe: {formatCurrency(fkg.summary.payablesTotal)}
              </div>
            </div>

            {/* Grounding guarantee */}
            <p className="text-[10px] text-zinc-400 leading-relaxed pt-1">
              Financial questions are cross-referenced directly against your live ledger nodes for zero hallucinations.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Conversational Workspace & Voice Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
            {/* Subtle offline notice when no key is entered */}
            {!apiKey && (
              <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900">
                <span className="text-[11px]">
                  💡 Running on offline ledger engine. Click <strong>Gemini Key</strong> to connect free AI for answering any question!
                </span>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(true)}
                  className="text-[10px] font-bold underline hover:text-black shrink-0 cursor-pointer ml-2"
                >
                  Connect Key
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-black text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-black text-white rounded-tr-none'
                          : 'bg-zinc-100 text-zinc-900 rounded-tl-none border border-zinc-200 whitespace-pre-wrap'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {isUser && (
                      <div className="w-7 h-7 rounded-xl bg-zinc-200 text-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-500 text-xs p-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Google Gemini is reasoning...</span>
                </div>
              )}

              {/* Action Proposals Cards in Chat Flow */}
              {pendingProposals.map((proposal) => {
                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-zinc-50 border border-zinc-300 rounded-2xl space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-black text-white rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-950">{proposal.title}</h4>
                          <p className="text-[11px] text-zinc-500">{proposal.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-200/80">
                      {proposal.applied ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 font-mono">
                          <Check className="w-3.5 h-3.5" /> Logged to Ledger
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApplyProposal(proposal)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm &amp; Log</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Starter Chips */}
            <div className="p-2.5 bg-zinc-50 border-t border-zinc-200 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
              {starterChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  disabled={isLoading}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-full text-[11px] text-zinc-700 whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar with Voice Dictation */}
            <div className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isListening
                    ? 'bg-red-500 text-white border-red-600 animate-pulse'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                }`}
                title={isListening ? 'Listening... click to stop' : 'Tap to speak via Voice'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isListening
                    ? 'Listening to your voice...'
                    : 'Ask anything or command Gemini (e.g. "Can I afford dinner?", "What is inflation?")...'
                }
                className="flex-1 px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || !inputPrompt.trim()}
                className="p-2.5 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Gemini API Key Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-black text-white rounded-xl">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-950">Google Gemini AI Engine</h3>
                    <p className="text-[11px] text-zinc-500">Free, fast chatbot &amp; financial reasoning</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-black cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-zinc-600">
                <p>
                  FinTrack is exclusively powered by <strong>Google Gemini</strong>. Enter your free API key to enable live conversational reasoning, answering any question (like the Gemini app), voice synthesis, and receipt scanning.
                </p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-black hover:underline"
                >
                  <span>Get your 100% Free Gemini Key from Google AI Studio</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-700 block">
                  Gemini API Key (Saved securely in this browser)
                </label>
                <input
                  type="password"
                  value={tempKeyInput}
                  onChange={(e) => setTempKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black focus:bg-white"
                />
              </div>

              {keySavedToast && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Gemini key saved successfully! Full chatbot features active.</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
                {apiKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('fintrack_gemini_api_key');
                      setApiKey('');
                      setTempKeyInput('');
                      setShowKeyModal(false);
                    }}
                    className="text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove Key
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyModal(false)}
                    className="px-3 py-1.5 text-xs text-zinc-600 hover:text-black rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const key = tempKeyInput.trim();
                      setApiKey(key);
                      if (key) {
                        localStorage.setItem('fintrack_gemini_api_key', key);
                        setKeySavedToast(true);
                        setTimeout(() => {
                          setKeySavedToast(false);
                          setShowKeyModal(false);
                        }, 800);
                      } else {
                        localStorage.removeItem('fintrack_gemini_api_key');
                        setShowKeyModal(false);
                      }
                    }}
                    className="px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
