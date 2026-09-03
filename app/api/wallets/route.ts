import { NextResponse } from 'next/server';
import { WalletBalances } from '@/lib/types';
import { DEFAULT_WALLETS } from '@/lib/sampleData';

// Memory fallback for Vercel Serverless
let inMemoryWallets: WalletBalances = { ...DEFAULT_WALLETS };

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: inMemoryWallets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === 'reset') {
      inMemoryWallets = { ...DEFAULT_WALLETS, lastUpdated: Date.now() };
      return NextResponse.json({ success: true, data: inMemoryWallets });
    }

    if (typeof body.cashInHand === 'number' && typeof body.accountBalance === 'number') {
      inMemoryWallets = {
        cashInHand: body.cashInHand,
        accountBalance: body.accountBalance,
        lastUpdated: Date.now(),
      };
      return NextResponse.json({ success: true, data: inMemoryWallets });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid wallet data' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update wallets' },
      { status: 500 }
    );
  }
}
