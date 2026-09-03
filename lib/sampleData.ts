import { Transaction, BudgetConfig, TabItem, MonthlyDue, WalletBalances, QuickPreset } from './types';

export function getRelativeDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export const DEFAULT_BUDGET: BudgetConfig = {
  monthlyLimit: 25000,
  dailyAllowance: 600,
  currency: 'INR',
  currencySymbol: '₹',
};

export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Today
  {
    id: 'tx-today-1',
    type: 'expense',
    amount: 50,
    category: 'Chai & Snacks',
    description: 'Ginger Chai & Samosa',
    date: getRelativeDate(0),
    time: '09:15:20',
    timestamp: `${getRelativeDate(0)}T09:15:20`,
    paymentMethod: 'UPI / Bank',
    notes: 'Morning tea break via UPI',
    createdAt: Date.now() - 1000 * 60 * 60 * 5,
    synced: true,
  },
  {
    id: 'tx-today-2',
    type: 'expense',
    amount: 160,
    category: 'Food & Dining',
    description: 'Executive Lunch Thali',
    date: getRelativeDate(0),
    time: '13:20:45',
    timestamp: `${getRelativeDate(0)}T13:20:45`,
    paymentMethod: 'UPI / Bank',
    notes: 'Lunch near office',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    synced: true,
  },
  {
    id: 'tx-today-3',
    type: 'income',
    amount: 1500,
    category: 'Freelance / Consulting',
    description: 'Freelance Consultation Advance',
    date: getRelativeDate(0),
    time: '11:30:00',
    timestamp: `${getRelativeDate(0)}T11:30:00`,
    paymentMethod: 'UPI / Bank',
    notes: 'Received via GPay',
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    synced: true,
  },

  // Yesterday
  {
    id: 'tx-yest-1',
    type: 'expense',
    amount: 420,
    category: 'Groceries & Kirana',
    description: 'Fresh Veggies, Milk & Bread',
    date: getRelativeDate(1),
    time: '18:45:10',
    timestamp: `${getRelativeDate(1)}T18:45:10`,
    paymentMethod: 'UPI / Bank',
    createdAt: Date.now() - 1000 * 60 * 60 * 25,
    synced: true,
  },
  {
    id: 'tx-yest-2',
    type: 'expense',
    amount: 60,
    category: 'Transport & Metro',
    description: 'Metro Card Recharge',
    date: getRelativeDate(1),
    time: '08:50:30',
    timestamp: `${getRelativeDate(1)}T08:50:30`,
    paymentMethod: 'Card',
    createdAt: Date.now() - 1000 * 60 * 60 * 35,
    synced: true,
  },

  // 2 days ago
  {
    id: 'tx-2d-1',
    type: 'expense',
    amount: 350,
    category: 'Food & Dining',
    description: 'Dinner Biryani & Raita',
    date: getRelativeDate(2),
    time: '20:40:15',
    timestamp: `${getRelativeDate(2)}T20:40:15`,
    paymentMethod: 'UPI / Bank',
    createdAt: Date.now() - 1000 * 60 * 60 * 50,
    synced: true,
  },

  // 3 days ago
  {
    id: 'tx-3d-1',
    type: 'expense',
    amount: 799,
    category: 'Bills & Utilities',
    description: 'Fiber Wi-Fi Monthly Bill',
    date: getRelativeDate(3),
    time: '10:15:00',
    timestamp: `${getRelativeDate(3)}T10:15:00`,
    paymentMethod: 'UPI / Bank',
    createdAt: Date.now() - 1000 * 60 * 60 * 73,
    synced: true,
  },

  // 5 days ago (Monthly Salary)
  {
    id: 'tx-5d-income',
    type: 'income',
    amount: 48000,
    category: 'Salary',
    description: 'Monthly Engineering Salary',
    date: getRelativeDate(5),
    time: '09:00:00',
    timestamp: `${getRelativeDate(5)}T09:00:00`,
    paymentMethod: 'UPI / Bank',
    notes: 'Direct Bank NEFT',
    createdAt: Date.now() - 1000 * 60 * 60 * 120,
    synced: true,
  },

  // 6 days ago (Rent)
  {
    id: 'tx-6d-1',
    type: 'expense',
    amount: 12500,
    category: 'Rent & Maintenance',
    description: 'Flat Rent Share',
    date: getRelativeDate(6),
    time: '11:00:00',
    timestamp: `${getRelativeDate(6)}T11:00:00`,
    paymentMethod: 'UPI / Bank',
    createdAt: Date.now() - 1000 * 60 * 60 * 145,
    synced: true,
  },
];

// Sample Tabs (Lent & Borrowed / Informal Splits)
export const INITIAL_TABS: TabItem[] = [
  {
    id: 'tab-1',
    personName: 'Rohan Sharma',
    amount: 650,
    type: 'owed_to_you', // Rohan owes me
    description: 'Dinner split at Biryani Blues',
    date: getRelativeDate(2),
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    notes: 'Split between 3, paid his share',
  },
  {
    id: 'tab-2',
    personName: 'Amit Verma',
    amount: 280,
    type: 'owed_to_you', // Amit owes me
    description: 'Uber cab share to airport',
    date: getRelativeDate(4),
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 60 * 96,
  },
  {
    id: 'tab-3',
    personName: 'Sneha Patel',
    amount: 1200,
    type: 'you_owe', // I owe Sneha
    description: 'Standup Comedy Show Ticket',
    date: getRelativeDate(3),
    status: 'pending',
    createdAt: Date.now() - 1000 * 60 * 60 * 70,
    notes: 'Need to Google Pay her back',
  },
  {
    id: 'tab-4',
    personName: 'Vikram Rao',
    amount: 400,
    type: 'owed_to_you',
    description: 'Movie ticket IMAX',
    date: getRelativeDate(8),
    status: 'settled',
    settledAt: Date.now() - 1000 * 60 * 60 * 24,
    createdAt: Date.now() - 1000 * 60 * 60 * 190,
  },
];

// Sample Monthly Dues (Recurring Bills with live day-of-month reminders)
export const INITIAL_MONTHLY_DUES: MonthlyDue[] = [
  {
    id: 'due-1',
    title: 'Apartment Rent Share',
    amount: 12500,
    category: 'Rent & Maintenance',
    dueDayOfMonth: 1, // 1st of every month
    paymentMethod: 'UPI / Bank',
    status: 'paid',
    lastPaidDate: getRelativeDate(3),
    notes: 'Transfer to landlord bank account',
  },
  {
    id: 'due-2',
    title: 'High-speed Fiber Wi-Fi',
    amount: 799,
    category: 'Bills & Utilities',
    dueDayOfMonth: 5, // 5th of every month
    paymentMethod: 'UPI / Bank',
    status: 'pending',
    notes: 'Airtel Broadband bill',
  },
  {
    id: 'due-3',
    title: 'Electricity & Power Bill',
    amount: 1450,
    category: 'Bills & Utilities',
    dueDayOfMonth: 12, // 12th of every month
    paymentMethod: 'UPI / Bank',
    status: 'pending',
    notes: 'State Discom bill via Cred',
  },
  {
    id: 'due-4',
    title: 'OTT Entertainment Bundle',
    amount: 499,
    category: 'Entertainment & OTT',
    dueDayOfMonth: 20, // 20th of every month
    paymentMethod: 'Card',
    status: 'pending',
    notes: 'Netflix & Spotify auto-debit',
  },
];

// Liquid Wallets: Cash in Hand vs Bank / Account
export const DEFAULT_WALLETS: WalletBalances = {
  cashInHand: 2450,
  accountBalance: 48500,
  lastUpdated: Date.now(),
};

// Default Customizable Quick 1-Tap Presets
export const DEFAULT_QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'preset-1',
    label: 'Chai & Snack',
    amount: 50,
    category: 'Chai & Snacks',
    paymentMethod: 'UPI / Bank',
    iconName: 'coffee',
  },
  {
    id: 'preset-2',
    label: 'Lunch / Thali',
    amount: 150,
    category: 'Food & Dining',
    paymentMethod: 'UPI / Bank',
    iconName: 'utensils',
  },
  {
    id: 'preset-3',
    label: 'Groceries / Kirana',
    amount: 450,
    category: 'Groceries & Kirana',
    paymentMethod: 'UPI / Bank',
    iconName: 'shopping-cart',
  },
  {
    id: 'preset-4',
    label: 'Auto / Metro',
    amount: 60,
    category: 'Transport & Metro',
    paymentMethod: 'Cash',
    iconName: 'bus',
  },
];

