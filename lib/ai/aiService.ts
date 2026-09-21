import {
  Transaction,
  WalletBalances,
  MonthlyDue,
  TabItem,
  BudgetConfig,
  ChatMessage,
  PaymentMethod,
  TransactionType,
} from '@/lib/types';
import {
  buildFinancialKnowledgeGraph,
  serializeKnowledgeGraphForLLM,
} from './knowledgeGraph';

export type AIProvider = 'gemini';

export interface ActionProposal {
  id: string;
  type: 'log_transaction' | 'settle_tab' | 'create_due' | 'adjust_wallet';
  title: string;
  description: string;
  payload: Record<string, any>;
  applied?: boolean;
}

export interface AIChatResponse {
  content: string;
  actionProposal?: ActionProposal;
}

export interface ChatRequestPayload {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  provider?: AIProvider;
  apiKey?: string;
  fkgData: {
    transactions: Transaction[];
    wallets: WalletBalances;
    dues: MonthlyDue[];
    tabs: TabItem[];
    budget: BudgetConfig;
  };
}

/**
 * Parses user message for deterministic action intent (logging, settling, etc.)
 */
export function detectActionIntent(message: string): ActionProposal | null {
  const lower = message.toLowerCase();

  // 1. Log transaction intent: e.g. "paid 120 for chai in cash", "spent 450 on groceries via upi", "log 200 for lunch"
  const spendMatch = lower.match(/(?:paid|spent|bought|log|record)\s*(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:for|on)?\s*([^,\.\n]+)/i);
  if (spendMatch) {
    const amount = parseFloat(spendMatch[1]);
    const rawDesc = spendMatch[2].trim();

    let method: PaymentMethod = 'UPI / Bank';
    if (lower.includes('cash') || lower.includes('hand')) {
      method = 'Cash';
    } else if (lower.includes('card')) {
      method = 'Card';
    }

    let category = 'Food & Dining';
    if (lower.includes('chai') || lower.includes('tea') || lower.includes('snack')) {
      category = 'Chai & Snacks';
    } else if (lower.includes('grocer') || lower.includes('kirana') || lower.includes('blinkit')) {
      category = 'Groceries & Kirana';
    } else if (lower.includes('auto') || lower.includes('metro') || lower.includes('cab') || lower.includes('uber')) {
      category = 'Transport & Metro';
    } else if (lower.includes('petrol') || lower.includes('fuel')) {
      category = 'Fuel & Petrol';
    } else if (lower.includes('bill') || lower.includes('recharge') || lower.includes('wifi')) {
      category = 'Bills & Utilities';
    }

    return {
      id: `act_${Date.now()}`,
      type: 'log_transaction',
      title: `Log ₹${amount} Expense`,
      description: `Record ₹${amount} for ${rawDesc} using ${method}`,
      payload: {
        amount,
        type: 'expense' as TransactionType,
        category,
        description: rawDesc.replace(/\s*(?:in cash|via upi|by card|cash|upi)\s*/gi, '').trim() || 'Expense',
        paymentMethod: method,
        date: new Date().toISOString().split('T')[0],
      },
    };
  }

  // 2. Settle tab intent: e.g. "settle tab with rahul", "rahul paid me back 500"
  const settleMatch = lower.match(/(?:settle|paid back|returned|repaid)\s*(?:tab)?\s*(?:with|from|by)?\s*([a-zA-Z]+)(?:\s*(?:rs\.?|₹)?\s*(\d+))?/i);
  if (settleMatch && settleMatch[1]) {
    const personName = settleMatch[1].trim();
    const amount = settleMatch[2] ? parseFloat(settleMatch[2]) : undefined;

    return {
      id: `act_${Date.now()}`,
      type: 'settle_tab',
      title: `Settle Tab for ${personName}`,
      description: `Mark pending tab with ${personName} as settled`,
      payload: {
        personName,
        amount,
      },
    };
  }

  return null;
}

/**
 * Built-in local Financial Knowledge Graph conversational reasoner.
 * Operates offline or when an external API key is not yet configured.
 */
export function generateKnowledgeGraphResponse(
  query: string,
  fkgContext: string,
  fkgData: ChatRequestPayload['fkgData']
): AIChatResponse {
  const lower = query.toLowerCase();
  const fkg = buildFinancialKnowledgeGraph(fkgData);
  const { summary, nodes } = fkg;
  const hand = nodes.get('wallet_hand')?.properties.balance ?? 0;
  const account = nodes.get('wallet_account')?.properties.balance ?? 0;

  // Check for action intent
  const action = detectActionIntent(query);

  // Intent 1: Check cash / wallets
  if (lower.includes('wallet') || lower.includes('cash') || lower.includes('in hand') || lower.includes('bank') || lower.includes('balance') || lower.includes('how much do i have')) {
    const content = `Based on your **Financial Knowledge Graph**, here is your real-time liquidity breakdown:
- **Cash in Hand (Physical)**: ₹${hand.toLocaleString('en-IN')}
- **Bank & UPI Account**: ₹${account.toLocaleString('en-IN')}
- **Total Liquid Funds**: **₹${summary.totalLiquid.toLocaleString('en-IN')}**

You have ${summary.pendingDuesCount} upcoming monthly dues totaling ₹${summary.pendingDuesTotal.toLocaleString('en-IN')} pending this cycle.`;

    return { content, actionProposal: action || undefined };
  }

  // Intent 2: Who owes me or who do I owe
  if (lower.includes('owe') || lower.includes('tab') || lower.includes('debt') || lower.includes('lend') || lower.includes('borrow')) {
    const receivables: string[] = [];
    const payables: string[] = [];

    fkg.edges.forEach((edge) => {
      if (edge.type === 'OWES_USER') {
        const p = nodes.get(edge.source);
        if (p) receivables.push(`- **${p.label}**: owes you ₹${edge.weight} (${edge.label || 'Tab'})`);
      } else if (edge.type === 'USER_OWES') {
        const p = nodes.get(edge.target);
        if (p) payables.push(`- **${p.label}**: you owe ₹${edge.weight} (${edge.label || 'Tab'})`);
      }
    });

    let content = `### Social Counterparty Matrix\n`;
    if (receivables.length > 0) {
      content += `**People who owe you (₹${summary.receivablesTotal}):**\n${receivables.join('\n')}\n\n`;
    } else {
      content += `No one owes you any pending money right now.\n\n`;
    }

    if (payables.length > 0) {
      content += `**People you owe (₹${summary.payablesTotal}):**\n${payables.join('\n')}\n`;
    } else {
      content += `You do not owe any pending tabs to anyone!`;
    }

    return { content, actionProposal: action || undefined };
  }

  // Intent 3: Upcoming bills or dues
  if (lower.includes('due') || lower.includes('bill') || lower.includes('rent') || lower.includes('upcoming') || lower.includes('recharge')) {
    const duesList: string[] = [];
    nodes.forEach((n) => {
      if (n.type === 'due') {
        duesList.push(`- **${n.properties.title}**: ₹${n.properties.amount} (Due on Day ${n.properties.dueDayOfMonth}, Status: *${n.properties.status}*)`);
      }
    });

    const content = `### Scheduled Monthly Obligations
You have **${summary.pendingDuesCount} pending dues** totaling **₹${summary.pendingDuesTotal.toLocaleString('en-IN')}**:
${duesList.length > 0 ? duesList.join('\n') : 'No upcoming bills registered.'}

Your current liquid funds are **₹${summary.totalLiquid.toLocaleString('en-IN')}**, leaving a net projected cushion of **₹${(summary.totalLiquid - summary.pendingDuesTotal).toLocaleString('en-IN')}** after all bills.`;

    return { content, actionProposal: action || undefined };
  }

  // Intent 4: Top spending / categories
  if (lower.includes('spend') || lower.includes('category') || lower.includes('expense') || lower.includes('most') || lower.includes('where is my money')) {
    const cats: Array<{ label: string; amount: number; count: number }> = [];
    nodes.forEach((n) => {
      if (n.type === 'category' && n.properties.type === 'expense') {
        cats.push({ label: n.label, amount: n.properties.totalAmount, count: n.properties.transactionCount });
      }
    });
    cats.sort((a, b) => b.amount - a.amount);

    const topList = cats.slice(0, 5).map((c, idx) => `${idx + 1}. **${c.label}**: ₹${c.amount.toLocaleString('en-IN')} (${c.count} transactions)`);

    const content = `### Spending Concentration
- **Total Recorded Expenditures**: ₹${summary.totalOutflows.toLocaleString('en-IN')}
- **Primary Driver**: **${summary.topCategory}**

**Top Expense Categories:**
${topList.join('\n')}

Would you like advice on optimizing any of these categories?`;

    return { content, actionProposal: action || undefined };
  }

  // Intent 5: Can I afford X
  if (lower.includes('can i afford') || lower.includes('should i buy')) {
    const match = lower.match(/(?:afford|buy)\s*(?:rs\.?|₹)?\s*(\d+)/i);
    const amount = match ? parseFloat(match[1]) : 500;
    const cushion = summary.totalLiquid - summary.pendingDuesTotal;

    let content = '';
    if (cushion >= amount * 2) {
      content = `Yes, you can comfortably afford **₹${amount.toLocaleString('en-IN')}**!
- Current Liquid Funds: ₹${summary.totalLiquid.toLocaleString('en-IN')}
- Locked for upcoming bills: ₹${summary.pendingDuesTotal.toLocaleString('en-IN')}
- True unencumbered cushion: **₹${cushion.toLocaleString('en-IN')}**
Even after spending ₹${amount}, you will retain ₹${(cushion - amount).toLocaleString('en-IN')} of safe liquidity.`;
    } else if (cushion >= amount) {
      content = `You can afford **₹${amount.toLocaleString('en-IN')}**, but it will leave your reserves tight before upcoming dues (₹${summary.pendingDuesTotal} committed). Proceed with caution.`;
    } else {
      content = `Caution recommended: Spending **₹${amount.toLocaleString('en-IN')}** would dip into funds reserved for upcoming bills. Your current unencumbered cushion is only ₹${Math.max(0, cushion).toLocaleString('en-IN')}.`;
    }

    return { content, actionProposal: action || undefined };
  }

  // Default intelligent assistant response grounded in FKG
  let defaultMsg = `I am your **Google Gemini Financial Copilot**. Right now I am operating in offline ledger mode because a Gemini API key is not connected yet.

I can answer your real-time financial ledger questions offline:
• *"How much do I have in hand vs account?"* (You have ₹${summary.totalLiquid.toLocaleString('en-IN')})
• *"Who owes me money or what tabs are pending?"*
• *"What are my upcoming dues this month?"*
• *"Can I afford a ₹1,200 purchase?"*
• *"Log ₹150 for lunch via upi"*

✨ **To ask general questions** (knowledge, writing, coding, or conversational chat like Google Gemini), click the **Gemini Key** button in the header and paste your free key from [Google AI Studio](https://aistudio.google.com/)!`;

  if (action) {
    defaultMsg = `I've prepared a ledger proposal based on your message:\n- **${action.title}**: ${action.description}\n\nReview and confirm below to record this into your ledger.`;
  }

  return {
    content: defaultMsg,
    actionProposal: action || undefined,
  };
}
