import {
  Transaction,
  WalletBalances,
  MonthlyDue,
  TabItem,
  BudgetConfig,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export type NodeType =
  | 'wallet'
  | 'transaction'
  | 'category'
  | 'person'
  | 'due'
  | 'metric';

export type EdgeType =
  | 'DEDUCTED_FROM'
  | 'CREDITED_TO'
  | 'CATEGORIZED_AS'
  | 'OWES_USER'
  | 'USER_OWES'
  | 'SCHEDULED_FOR'
  | 'CONNECTED_TO';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  weight?: number;
  label?: string;
}

export interface FinancialKnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  summary: {
    totalLiquid: number;
    totalInflows: number;
    totalOutflows: number;
    pendingDuesCount: number;
    pendingDuesTotal: number;
    receivablesTotal: number;
    payablesTotal: number;
    topCategory: string;
    nodeCount: number;
    edgeCount: number;
  };
}

/**
 * Builds a complete in-memory Financial Knowledge Graph from the app's live state.
 */
export function buildFinancialKnowledgeGraph(data: {
  transactions: Transaction[];
  wallets: WalletBalances;
  dues: MonthlyDue[];
  tabs: TabItem[];
  budget: BudgetConfig;
}): FinancialKnowledgeGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const { transactions, wallets, dues, tabs, budget } = data;

  // 1. Wallet Nodes
  const walletHandNode: GraphNode = {
    id: 'wallet_hand',
    type: 'wallet',
    label: 'Cash in Hand',
    properties: {
      balance: wallets.cashInHand || 0,
      currency: 'INR',
      method: 'Cash',
    },
  };
  const walletAccountNode: GraphNode = {
    id: 'wallet_account',
    type: 'wallet',
    label: 'Bank & UPI Account',
    properties: {
      balance: wallets.accountBalance || 0,
      currency: 'INR',
      method: 'UPI / Bank',
    },
  };
  nodes.set(walletHandNode.id, walletHandNode);
  nodes.set(walletAccountNode.id, walletAccountNode);

  // 2. Category Aggregations & Nodes
  const categoryMap = new Map<string, { total: number; count: number; type: string }>();
  let totalInflows = 0;
  let totalOutflows = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalInflows += tx.amount;
    } else {
      totalOutflows += tx.amount;
    }

    const catKey = `${tx.type}:${tx.category}`;
    const curr = categoryMap.get(catKey) || { total: 0, count: 0, type: tx.type };
    curr.total += tx.amount;
    curr.count += 1;
    categoryMap.set(catKey, curr);

    // Transaction Node (last 50 for detailed memory)
    if (nodes.size < 80) {
      const txNode: GraphNode = {
        id: `tx_${tx.id}`,
        type: 'transaction',
        label: `${tx.description} (${formatCurrency(tx.amount)})`,
        properties: {
          amount: tx.amount,
          type: tx.type,
          category: tx.category,
          date: tx.date,
          paymentMethod: tx.paymentMethod,
        },
      };
      nodes.set(txNode.id, txNode);

      // Edge to Category
      edges.push({
        id: `edge_tx_cat_${tx.id}`,
        source: txNode.id,
        target: `cat_${tx.category}`,
        type: 'CATEGORIZED_AS',
      });

      // Edge to Wallet
      const targetWallet = tx.paymentMethod === 'Cash' ? 'wallet_hand' : 'wallet_account';
      edges.push({
        id: `edge_tx_wallet_${tx.id}`,
        source: txNode.id,
        target: targetWallet,
        type: tx.type === 'expense' ? 'DEDUCTED_FROM' : 'CREDITED_TO',
        weight: tx.amount,
      });
    }
  });

  // Add Category Nodes
  categoryMap.forEach((val, key) => {
    const [type, catName] = key.split(':');
    const catId = `cat_${catName}`;
    if (!nodes.has(catId)) {
      nodes.set(catId, {
        id: catId,
        type: 'category',
        label: catName,
        properties: {
          type,
          totalAmount: val.total,
          transactionCount: val.count,
        },
      });
    }
  });

  // 3. Person Nodes & Tab Edges (Social Finance)
  let receivablesTotal = 0;
  let payablesTotal = 0;

  tabs.forEach((tab) => {
    const personId = `person_${tab.personName.toLowerCase().replace(/\s+/g, '_')}`;
    if (!nodes.has(personId)) {
      nodes.set(personId, {
        id: personId,
        type: 'person',
        label: tab.personName,
        properties: {
          name: tab.personName,
        },
      });
    }

    if (tab.status === 'pending') {
      if (tab.type === 'owed_to_you') {
        receivablesTotal += tab.amount;
        edges.push({
          id: `edge_tab_${tab.id}`,
          source: personId,
          target: 'wallet_account',
          type: 'OWES_USER',
          weight: tab.amount,
          label: tab.description,
        });
      } else {
        payablesTotal += tab.amount;
        edges.push({
          id: `edge_tab_${tab.id}`,
          source: 'wallet_account',
          target: personId,
          type: 'USER_OWES',
          weight: tab.amount,
          label: tab.description,
        });
      }
    }
  });

  // 4. Monthly Dues Nodes & Edges
  let pendingDuesTotal = 0;
  let pendingDuesCount = 0;

  dues.forEach((due) => {
    const dueId = `due_${due.id}`;
    const targetWallet = due.paymentMethod === 'Cash' ? 'wallet_hand' : 'wallet_account';

    if (due.status !== 'paid') {
      pendingDuesTotal += due.amount;
      pendingDuesCount += 1;
    }

    nodes.set(dueId, {
      id: dueId,
      type: 'due',
      label: `${due.title} (₹${due.amount})`,
      properties: {
        title: due.title,
        amount: due.amount,
        category: due.category,
        dueDayOfMonth: due.dueDayOfMonth,
        status: due.status,
      },
    });

    edges.push({
      id: `edge_due_${due.id}`,
      source: dueId,
      target: targetWallet,
      type: 'SCHEDULED_FOR',
      weight: due.amount,
    });
  });

  // Find top category
  let topCategory = 'None';
  let topCatAmount = 0;
  categoryMap.forEach((val, key) => {
    if (key.startsWith('expense:') && val.total > topCatAmount) {
      topCatAmount = val.total;
      topCategory = key.replace('expense:', '');
    }
  });

  const totalLiquid = (wallets.cashInHand || 0) + (wallets.accountBalance || 0);

  return {
    nodes,
    edges,
    summary: {
      totalLiquid,
      totalInflows,
      totalOutflows,
      pendingDuesCount,
      pendingDuesTotal,
      receivablesTotal,
      payablesTotal,
      topCategory,
      nodeCount: nodes.size,
      edgeCount: edges.length,
    },
  };
}

/**
 * Serializes the Knowledge Graph into a comprehensive prompt context for the LLM.
 * This guarantees the AI has full, deep personalization and factual grounding.
 */
export function serializeKnowledgeGraphForLLM(fkg: FinancialKnowledgeGraph): string {
  const { summary, nodes } = fkg;

  // Extract Wallets
  const hand = nodes.get('wallet_hand')?.properties.balance ?? 0;
  const account = nodes.get('wallet_account')?.properties.balance ?? 0;

  // Extract People
  const people: string[] = [];
  fkg.edges.forEach((edge) => {
    if (edge.type === 'OWES_USER') {
      const pNode = nodes.get(edge.source);
      if (pNode) {
        people.push(`- ${pNode.label} OWES user ₹${edge.weight} (${edge.label || 'Tab'})`);
      }
    } else if (edge.type === 'USER_OWES') {
      const pNode = nodes.get(edge.target);
      if (pNode) {
        people.push(`- User OWES ${pNode.label} ₹${edge.weight} (${edge.label || 'Tab'})`);
      }
    }
  });

  // Extract Dues
  const duesList: string[] = [];
  nodes.forEach((node) => {
    if (node.type === 'due') {
      duesList.push(
        `- ${node.properties.title}: ₹${node.properties.amount} (Due on Day ${node.properties.dueDayOfMonth} of month, Status: ${node.properties.status})`
      );
    }
  });

  // Extract Top Categories
  const categoryStats: string[] = [];
  nodes.forEach((node) => {
    if (node.type === 'category') {
      categoryStats.push(
        `- ${node.label} (${node.properties.type}): ₹${node.properties.totalAmount} across ${node.properties.transactionCount} transactions`
      );
    }
  });

  return `
=== FINTRACK FINANCIAL KNOWLEDGE GRAPH (LIVE SNAPSHOT) ===
- TOTAL LIQUID FUNDS: ₹${summary.totalLiquid.toLocaleString('en-IN')}
  * Cash in Hand (Physical): ₹${hand.toLocaleString('en-IN')}
  * Bank Accounts / UPI: ₹${account.toLocaleString('en-IN')}

- LIFETIME CASHFLOW:
  * Total Inflows / Earnings: ₹${summary.totalInflows.toLocaleString('en-IN')}
  * Total Outflows / Spending: ₹${summary.totalOutflows.toLocaleString('en-IN')}
  * Top Expense Category: ${summary.topCategory}

- UPCOMING RECURRING OBLIGATIONS (${summary.pendingDuesCount} pending, ₹${summary.pendingDuesTotal}):
${duesList.length > 0 ? duesList.join('\n') : '  None registered.'}

- COUNTERPARTY SOCIAL DEBT MATRIX (Receivables: ₹${summary.receivablesTotal}, Payables: ₹${summary.payablesTotal}):
${people.length > 0 ? people.join('\n') : '  All tabs settled.'}

- TOP CATEGORIES & VOLUME:
${categoryStats.slice(0, 8).join('\n')}
==========================================================
`;
}
