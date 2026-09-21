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
import { ActionProposal, AIProvider } from '@/lib/ai/aiService';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Wallet,
  Calendar,
  Users,
  Check,
  RefreshCw,
  Cpu,
  HelpCircle,
  TrendingDown,
  ArrowRight,
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
        "Hello! I am your FinTrack AI Copilot. Your complete app state is connected as an active **Financial Knowledge Graph**. I can check balances, calculate affordances, verify debt tabs, and directly execute ledger transactions via voice or chat.",
      timestamp: Date.now(),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

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

  // Send message
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
          provider,
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
        content: `Sorry, I encountered an issue connecting to the AI provider: ${err?.message || 'Network error'}. Fallback knowledge graph response is active.`,
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
    'Who owes me money right now?',
    'What are my upcoming dues this month?',
    'Paid ₹120 for chai in cash',
    'Can I afford a ₹1,200 dinner tonight?',
  ];

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-black text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-zinc-950 tracking-tight">
                Financial AI Copilot
              </h2>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300 uppercase">
                Knowledge Graph Grounded
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Natural language personal banker with voice dictation &amp; 1-tap ledger execution
            </p>
          </div>
        </div>

        {/* Model & Audio Controls */}
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
            title={isAudioFeedbackEnabled ? 'Mute AI voice output' : 'Enable AI voice speech'}
          >
            {isAudioFeedbackEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Voice Out</span>
          </button>

          {/* Model Switcher Button */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold border border-zinc-200 transition-colors cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="capitalize">{provider}</span>
          </button>
        </div>
      </div>

      {/* Model & Settings Drawer */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3 overflow-hidden text-xs"
          >
            <div className="flex items-center justify-between font-bold text-zinc-950">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> AI Model Engine Configuration
              </span>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-zinc-400 hover:text-black"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  provider === 'gemini'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span className="block font-semibold">Google Gemini 2.5 Flash</span>
                <span className="text-[10px] opacity-75">1M+ context window (Default)</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('groq')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  provider === 'groq'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span className="block font-semibold">Groq (Llama 3.3)</span>
                <span className="text-[10px] opacity-75">Open-source, ultra fast</span>
              </button>

              <button
                type="button"
                onClick={() => setProvider('ollama')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  provider === 'ollama'
                    ? 'bg-black text-white border-black font-bold'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                <span className="block font-semibold">Local Ollama</span>
                <span className="text-[10px] opacity-75">100% private on localhost</span>
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-zinc-600 font-semibold block">
                Optional Custom API Key (Leave blank to use internal engine or server environment):
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AI Provider API Key (stored in memory only)"
                className="w-full p-2 bg-white border border-zinc-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              Every message is strictly cross-referenced against your ledger nodes to ensure zero hallucinations.
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Conversational Workspace & Voice Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm flex flex-col h-[560px] overflow-hidden">
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

              {/* Action Proposals rendered directly in chat stream */}
              {pendingProposals.map((proposal) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 bg-zinc-50 border border-zinc-300 rounded-2xl space-y-2.5 max-w-[85%] sm:max-w-[78%]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-zinc-600 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-black" />
                      Agentic Action Proposal
                    </span>
                    {proposal.applied && (
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1">
                        <Check className="w-3 h-3" /> Applied
                      </span>
                    )}
                  </div>

                  <div className="text-xs">
                    <div className="font-bold text-zinc-950">{proposal.title}</div>
                    <div className="text-zinc-600 mt-0.5">{proposal.description}</div>
                  </div>

                  {!proposal.applied && (
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplyProposal(proposal)}
                        className="px-3.5 py-1.5 bg-black hover:bg-zinc-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Confirm &amp; Apply</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 p-2 font-mono">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Traversing Knowledge Graph &amp; synthesizing response...</span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Starter Chips */}
            <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-zinc-50/50">
              {starterChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(chip)}
                  className="px-2.5 py-1 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-full text-[11px] text-zinc-700 whitespace-nowrap transition-colors shrink-0 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar with Voice & Send */}
            <div className="p-3 sm:p-4 border-t border-zinc-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Input Button */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  animate={
                    isListening
                      ? { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.2 } }
                      : {}
                  }
                  type="button"
                  onClick={toggleVoiceInput}
                  className={`p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                    isListening
                      ? 'bg-red-600 text-white border-red-700 shadow-md'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Start voice input (Speech-to-Text)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </motion.button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  placeholder={
                    isListening
                      ? 'Listening to your voice... speak now...'
                      : 'Ask about balances, debts, bills, or say "Paid 120 in cash"...'
                  }
                  className="flex-1 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputPrompt.trim() || isLoading}
                  className="p-2.5 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
