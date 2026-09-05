import { PaymentMethod, TransactionType } from '@/lib/types';

export interface ParsedSmsTransaction {
  amount: number;
  type: TransactionType;
  description: string;
  category: string;
  paymentMethod: PaymentMethod;
  rawText: string;
  confidence: number; // 0 to 1
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Food & Dining': ['swiggy', 'zomato', 'restaurant', 'cafe', 'canteen', 'dhaba', 'burger', 'pizza', 'food', 'mcdonalds'],
  'Chai & Snacks': ['chai', 'tea', 'coffee', 'bakery', 'snack', 'pan', 'tapri'],
  'Fuel & Petrol': ['petrol', 'diesel', 'fuel', 'hpcl', 'ioc', 'bpcl', 'shell', 'cng'],
  'Transport & Metro': ['uber', 'ola', 'rapido', 'metro', 'auto', 'railway', 'irctc', 'bus', 'fare'],
  'Groceries & Kirana': ['kirana', 'supermarket', 'blinkit', 'zepto', 'instamart', 'bigbasket', 'store', 'grocery'],
  'Mobile & Wifi': ['airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'recharge', 'wifi', 'broadband'],
  'Medical & Pharmacy': ['pharmacy', 'medical', 'hospital', 'doctor', 'apollo', 'clinic', 'medicine', 'chemist'],
  'Salary / Wage': ['salary', 'wage', 'stipend', 'payout', 'freelance'],
};

export function parseBankSms(text: string): ParsedSmsTransaction | null {
  if (!text || text.trim().length < 8) return null;

  const cleanText = text.trim();
  const lower = cleanText.toLowerCase();

  // 1. Detect Type (Debit / Credit)
  let type: TransactionType = 'expense';
  const debitKeywords = ['debited', 'debit', 'paid', 'spent', 'sent', 'transferred', 'withdrawn', 'charged', 'txn of rs'];
  const creditKeywords = ['credited', 'credit', 'received', 'deposited', 'refund', 'cashback', 'salary credited'];

  const isCredit = creditKeywords.some((w) => lower.includes(w));
  const isDebit = debitKeywords.some((w) => lower.includes(w));

  if (isCredit && !isDebit) {
    type = 'income';
  } else {
    type = 'expense';
  }

  // 2. Extract Amount (e.g. Rs. 250, INR 1,500.50, Rs 50, ₹100)
  const amountRegex = /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amountMatch = cleanText.match(amountRegex);

  let amount = 0;
  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  } else {
    // Fallback: look for standalone number near debit/credit
    const fallbackRegex = /(?:debited|credited|paid|received|spent)\s+(?:by\s+)?(?:for\s+)?([\d,]+(?:\.\d{1,2})?)/i;
    const fallbackMatch = cleanText.match(fallbackRegex);
    if (fallbackMatch && fallbackMatch[1]) {
      amount = parseFloat(fallbackMatch[1].replace(/,/g, ''));
    }
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return null; // Could not reliably find amount
  }

  // 3. Extract Merchant / Beneficiary / Reason
  let description = '';

  // Patterns like "to SWIGGY", "at SHELL", "from RAHUL", "towards RENT", "info: XYZ"
  const merchantPatterns = [
    /(?:to|at|towards|vpa|info|for)\s+([a-zA-Z0-9\s&'-]{3,25}?)(?:\.|\s+on|\s+ref|\s+upi|\s+bal|\s+avbl|$)/i,
    /(?:from|by)\s+([a-zA-Z0-9\s&'-]{3,25}?)(?:\.|\s+on|\s+ref|\s+upi|\s+bal|\s+avbl|$)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim();
      // Filter out non-merchant noise words
      if (!['your', 'a/c', 'account', 'card', 'bank', 'upi', 'ref', 'inr', 'rs'].includes(candidate.toLowerCase())) {
        description = candidate;
        break;
      }
    }
  }

  if (!description) {
    description = type === 'income' ? 'Received Funds' : 'Online / UPI Payment';
  }

  // 4. Infer Category
  let category = type === 'income' ? 'Salary / Daily Wage' : 'General & Other';
  const descLower = description.toLowerCase();

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k) || descLower.includes(k))) {
      category = cat;
      break;
    }
  }

  // 5. Detect Payment Method
  let paymentMethod: PaymentMethod = 'UPI / Bank';
  if (lower.includes('cash') || lower.includes('atm') || lower.includes('withdrawn')) {
    paymentMethod = 'Cash';
  } else if (lower.includes('card')) {
    paymentMethod = 'Card';
  } else {
    paymentMethod = 'UPI / Bank';
  }

  return {
    amount,
    type,
    description: description.charAt(0).toUpperCase() + description.slice(1),
    category,
    paymentMethod,
    rawText: cleanText,
    confidence: description !== 'Online / UPI Payment' ? 0.9 : 0.75,
  };
}
