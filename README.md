# FinTrack — Minimalist Daily Personal Finance & Expense Tracker PWA

A minimalist, high-performance Progressive Web App (PWA) and personal finance tracker built with **Next.js 15**, **Tailwind CSS**, and **TypeScript**, optimized for deployment on **Vercel's Free Tier** and installation on **Android** and mobile devices.

Designed with clean grey backgrounds, stark black typography, high-contrast indicators, and zero bloat.

---

## 🚀 Key Features

### 1. Liquid Funds & Wallets Tracking (Top of Home Page)
- **Money in Hand (Cash)**: Tracks physical cash in your wallet/pocket.
- **Money in Account (Digital / Bank)**: Tracks balances accessible via UPI, Cards, and Net Banking.
- **Total Available Liquidity**: Real-time sum of your cash and digital accounts.
- **Instant Adjustments**: 1-click modal to calibrate starting balances at any time.

### 2. Automatic Balance Deductions & Inflows
- **Cash Expenses** $\rightarrow$ Automatically deducted from **Money in Hand**.
- **UPI & Card Expenses** $\rightarrow$ Automatically deducted from **Money in Account**.
- **Inflows / Income** $\rightarrow$ Added to the respective wallet.
- **Reversals on Edit & Delete** $\rightarrow$ Automatically restores or updates balance deltas.

### 3. Customizable Quick 1-Tap Logs
- **Custom Presets**: Create, edit, and delete one-tap expense buttons (e.g. Chai ₹50, Lunch ₹150, Kirana ₹450, Metro ₹60).
- **Wallet Link**: Configure each preset to automatically pull from Cash or UPI.
- **Icon Customization**: Coffee, Utensils, Groceries, Metro, Petrol, Bills, Recharge, and more.

### 4. Separate Tabs (Lent & Borrowed / Informal Splits)
- Track **"Someone Owes You"** (+) vs **"You Have to Give Back"** (-).
- Net balance overview with 1-click **"Settle"** button that resolves debts and archives them.
- Search and filter by friend's name, amount, or reason.

### 5. Separate Monthly Dues & Recurring Commitments
- Track recurring monthly obligations: Rent, Wi-Fi, Electricity, EMIs, OTT subscriptions.
- **Real-Time Dynamic Reminders**: Calculates countdowns against today's date (`Overdue`, `Due Today`, `Due in X Days`, `Paid`).
- **1-Click "Pay & Record"**: Marks the bill paid for the month and instantly logs an expense with the live timestamp into your ledger.

### 6. Multi-Period Deep Analytics
- **Daily Spending**: 14-day spending trajectory, daily average, and highest spend day.
- **Weekly & Monthly Trends**: Cashflow comparisons and spending velocity.
- **"What I Have Spent On"**: Ranked category distribution with progress bars.
- **Payment Mode Intelligence**: Breakdown across UPI/Bank, Cards, and Cash.
- **Peak Spending Time of Day**: Morning, Afternoon, Evening, and Night analysis.

### 7. Progressive Web App (PWA) & Android Integration
- **Strict Chromium PWA Compliance**: Registered Service Worker (`sw.js`), valid `manifest.json`, and 192x192 / 512x512 maskable icons.
- **Native Android Install**: Directly triggers the real Android Chrome system install bottom-sheet.
- **Native Android Bottom Navigation Bar**: Fixed bottom bar with haptic feedback, safe area padding, and real-time notification badges.
- **Mobile Viewport Lock**: Disabled accidental pinch/double-tap zoom and eliminated horizontal page drift.

### 8. Vercel Free-Tier Ready
- Zero external database required to start: built with offline-first client storage and Vercel KV / in-memory serverless fallbacks.
- 100% free forever on Vercel Hobby tier.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Service Worker Cache-First / Network-First Fallback
- **Deployment**: Vercel Serverless Functions

---

## 📦 Getting Started

### 1. Clone & Install
```bash
git clone <your-github-repo-url>
cd personal-finance-tracker
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build & Run Production
```bash
npm run build
npm start
```

---

## ☁️ Deploying to Vercel (100% Free)

1. Push this repository to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"New Project"**.
3. Select your GitHub repository and click **Deploy**.
4. (Optional) In Vercel Project Settings $\rightarrow$ Storage $\rightarrow$ Add **Vercel KV** for multi-device cloud synchronization.

---

## 📄 License
MIT
