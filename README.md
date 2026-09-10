# FinTrack — Minimalist Daily Personal Finance & Expense Tracker PWA

A minimalist, high-performance Progressive Web App (PWA) and personal finance tracker built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS**, and **TypeScript**, powered by **Supabase Realtime Cloud Sync** and **Google Gemini AI**.

Engineered with a high-contrast monochrome aesthetic (clean zinc/grey backgrounds, bold typography, high-contrast indicators, and zero bloat), FinTrack delivers an instant, offline-first experience optimized for mobile devices, Android installation, and free deployment on Vercel.

---

## 🚀 Key Features

### 1. Liquid Funds & Dual-Wallet Engine
- **Money in Hand (Cash)**: Accurately tracks physical cash in your wallet and pockets.
- **Money in Account (Digital / Bank)**: Tracks balances across bank accounts, UPI, and debit/credit cards.
- **Total Available Liquidity**: Instant, real-time aggregate of your liquid funds.
- **Automated Wallet Adjustments**:
  - Cash transactions automatically adjust **Money in Hand**.
  - UPI / Card / Bank transactions automatically adjust **Money in Account**.
  - Income inflows immediately increment the chosen wallet.
  - Editing or deleting transactions automatically reverses prior impacts and applies new deltas.
- **1-Tap Calibration Modal**: Calibrate your cash or account balances at any time with a single click.

### 2. AI Financial Assistant & Chatbot (Google Gemini)
- **Interactive Conversational AI**: Grounded financial assistant accessible via a floating trigger.
- **3-Pillar Financial Snapshot**:
  1. **What You HAVE**: Real-time liquid breakdown (Cash in Hand vs Account/Bank balance).
  2. **What You EARNED**: Recent shift wages, consulting fees, and income inflows.
  3. **What You WILL EARN**: Dynamic upcoming runway based on scheduled shifts, hourly/shift rate, and planned work calendar.
- **Holistic Obligation Tracking**: Evaluates all pending dues across your runway, unsettled tabs, and daily allowances to determine genuine safe spending limits.
- **Customizable In-App API Key**: Configure your Google Gemini API key directly from the UI or via environment variables.

### 3. AI Vision Receipt & UPI Screenshot Scanning
- **Multimodal Bill Extraction**: Upload or take photos of physical receipts, bills, or UPI payment confirmation screens.
- **Instant Ledger Parsing**: Automatically extracts merchant name, amount, date, category, and payment mode with 1-tap confirmation.

### 4. Bank SMS Transaction Parser
- **1-Tap Clipboard Ingestion**: Paste transactional SMS alerts from Indian banks (SBI, HDFC, ICICI, Axis, Kotak) or UPI apps (GPay, PhonePe, Paytm).
- **Auto-Detection**: Instantly parses amounts, merchants, debit/credit direction, and payment methods into ready-to-save ledger entries.

### 5. Customizable Quick 1-Tap Daily Logs
- **Custom Presets**: Log frequent transactions with one tap (e.g., Daily Wage, Chai & Snacks, Metro, Lunch).
- **Preset Management**: Create, edit, reorder, or delete presets with custom icons, amounts, categories, and linked payment methods (Cash or Account).

### 6. Tabs (Lent & Borrowed Ledger / Informal Splits)
- **Two-Way Debt Tracking**: Track **"Someone Owes You"** (+) versus **"You Have to Give Back"** (-).
- **1-Click Settlement**: Settle balances instantly with an option to record the settlement as an income/expense ledger transaction.
- **Search & Filter**: Quickly find tabs by person name, reason, or status.

### 7. Monthly Dues & Recurring Commitments
- **Recurring Obligations**: Manage recurring payments such as Rent, Wi-Fi, Electricity, EMIs, and Subscriptions.
- **Dynamic Real-Time Countdowns**: Badges dynamically indicate status (`Overdue`, `Due Today`, `Due in X Days`, `Paid`).
- **1-Click "Pay & Record"**: Marks dues as paid and automatically logs the expense to your ledger with live timestamping and wallet deduction.

### 8. Multi-Period Deep Analytics
- **Daily Spending Velocity**: Trajectory over 14 days with daily averages and peak expense tracking.
- **Weekly & Monthly Trends**: Net cashflow trends, income versus expense ratios, and savings rate analysis.
- **Category Breakdown**: Visual progress bars and ranked distributions of expenses and inflows.
- **Payment Mode Intelligence**: Distribution across UPI/Bank, Cards, and Cash.
- **Time-of-Day Insights**: Spending patterns broken down by Morning, Afternoon, Evening, and Night.

### 9. Real-Time Two-Way Cloud Sync (Supabase PostgreSQL)
- **Continuous Synchronization**: High-frequency continuous sync (2.5s polling loop) paired with Supabase Realtime Postgres change subscriptions.
- **Checksum Fingerprinting**: Lightweight hashing (`computeDataChecksum`) eliminates unnecessary re-renders and UI flickering.
- **Timestamp-Guarded Conflict Resolution**: Ensures in-flight network requests never overwrite newer local updates (`lastUpdated` guard).
- **Offline-First Architecture**: Changes persist instantly to local storage (`clientStorage`), sync synchronously to Supabase, and gracefully fall back to local/serverless storage when offline.

### 10. Progressive Web App (PWA) & Mobile First
- **Native Android PWA Installation**: Implements standard Web App Manifest (`manifest.json`) and Service Worker (`sw.js`) with maskable icons.
- **Native Android Bottom Navigation Bar**: Fixed bottom bar with haptic-like active states, safe-area padding, and live alert badges.
- **Viewport Lock**: Prevents accidental zoom and horizontal drift on mobile devices.

### 11. Complete Data Portability
- **JSON Backup & Restore**: Export full snapshots of your transactions, tabs, dues, presets, budget, and wallets, and restore them at any time.
- **CSV Ledger Export**: Download transactions formatted for Excel or Google Sheets.
- **Safe Ledger Resets**: Clean all data or restore defaults with built-in safety confirmations.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions & API Routes) |
| **Library** | React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS (Monochrome, high-contrast palette) |
| **Cloud Database** | Supabase (PostgreSQL + Realtime Channel Subscriptions) |
| **Artificial Intelligence** | Google Gemini (Gemini Flash multimodal vision & conversational chat) |
| **Icons** | Lucide React |
| **Offline / PWA** | Service Worker API & Web App Manifest |
| **Deployment** | Vercel (Hobby Tier — 100% Free Forever) |

---

## 📁 Project Structure

```text
├── app/
│   ├── api/
│   │   ├── ai/
│   │   │   ├── earn-first/route.ts  # Gemini AI Financial Assistant endpoint
│   │   │   └── scan/route.ts        # Gemini Vision Receipt/UPI scanner
│   │   ├── budget/route.ts          # Budget serverless endpoint
│   │   ├── dues/route.ts            # Monthly dues endpoint
│   │   ├── presets/route.ts         # Quick presets endpoint
│   │   ├── sync/route.ts            # Serverless fallback sync
│   │   ├── tabs/route.ts            # Tabs (lent/borrowed) endpoint
│   │   ├── transactions/route.ts    # Transactions CRUD endpoint
│   │   └── wallets/route.ts         # Wallets balance endpoint
│   ├── globals.css                  # Global styles & Tailwind configuration
│   ├── layout.tsx                   # Root HTML layout with PWA metadata
│   └── page.tsx                     # Main dashboard controller & state hub
├── components/
│   ├── ai/                          # Earn-first AI chat modal & floating trigger
│   ├── analytics/                   # Multi-period analytics & distribution cards
│   ├── daily/                       # Activity timeline, quick add bar, preset modal
│   ├── dues/                        # Monthly dues manager & payment modals
│   ├── layout/                      # Top header & mobile bottom navigation
│   ├── profile/                     # Profile, budget limit, and settings modal
│   ├── pwa/                         # PWA install banner & badge indicator
│   ├── tabs/                        # Lent & borrowed tabs modal & settlement
│   ├── transactions/                # Transaction entry modal, SMS paste, receipt scan
│   └── wallets/                     # Liquid funds cards & adjustment modal
├── lib/
│   ├── notifications/               # Browser notifications & due alerts
│   ├── parser/                      # Bank SMS regex and natural language parser
│   ├── storage/
│   │   ├── clientStorage.ts         # Synchronous local storage operations
│   │   └── vercelStorage.ts         # Serverless in-memory & KV fallback storage
│   ├── supabase/
│   │   ├── client.ts                # Supabase client singleton
│   │   ├── dbService.ts             # Granular & bulk Supabase CRUD service
│   │   └── realtimeSync.ts          # Continuous sync loop & checksum fingerprinting
│   ├── sampleData.ts                # Initial templates & presets
│   ├── types.ts                     # Full TypeScript interfaces & schemas
│   └── utils.ts                     # Currency formatting (₹ INR), time, and calculations
├── supabase/
│   └── schema.sql                   # Supabase PostgreSQL schema with RLS policies
└── public/
    ├── icons/                       # PWA maskable icons (192x192, 512x512)
    ├── manifest.json                # Web App Manifest
    └── sw.js                        # Progressive Web App Service Worker
```

---

## 📦 Getting Started

### Prerequisites
- **Node.js**: v18.18.0 or newer
- **npm**, **pnpm**, or **yarn**
- *(Optional)* A free [Supabase](https://supabase.com) account for cloud database synchronization
- *(Optional)* A [Google AI Studio](https://aistudio.google.com/) Gemini API key

### 1. Clone the Repository
```bash
git clone https://github.com/atse25029-collab/Fintrack.git
cd Fintrack
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Gemini API Key (Optional - Can also be configured directly in the app UI)
GEMINI_API_KEY=your-gemini-api-key
```

> **Note**: FinTrack is fully functional **offline-first** even without Supabase or Gemini keys configured. When unconfigured, it seamlessly uses local storage with zero runtime errors.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm start
```

---

## 🗄️ Supabase Database Setup

To enable multi-device synchronization:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open [`supabase/schema.sql`](supabase/schema.sql) in this repository, copy its contents, and execute the query.
4. Go to **Project Settings** $\rightarrow$ **API** and copy your **Project URL** and **anon public key** into your `.env.local` or Vercel environment variables.
5. In Supabase **Database** $\rightarrow$ **Replication**, ensure replication is enabled for tables (`transactions`, `wallets`, `tabs`, `monthly_dues`, `quick_presets`, `budget_config`) to support real-time pushes.

---

## ☁️ Deploying to Vercel (100% Free)

1. Push your code to your GitHub repository.
2. Visit [vercel.com](https://vercel.com) and click **"New Project"**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` *(Optional)*
5. Click **Deploy**. Vercel will build and deploy the application with zero extra configuration required.

---

## 📱 Installing on Android / iOS

1. Open your deployed URL (e.g. `https://your-app.vercel.app`) in **Google Chrome** (Android) or **Safari** (iOS).
2. **Android**:
   - Tap the **"Install App"** banner in the header, or open Chrome's menu (`⋮`) and select **"Add to Home screen"** / **"Install app"**.
3. **iOS**:
   - Tap the **Share** button (`⎋`) in Safari and select **"Add to Home Screen"**.
4. FinTrack launches in standalone full-screen mode with native mobile gestures and offline capability.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
