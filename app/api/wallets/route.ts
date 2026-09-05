import { NextResponse } from 'next/server';
import { getStoredWallets, saveWallets } from '@/lib/storage/vercelStorage';
import { DEFAULT_WALLETS } from '@/lib/sampleData';

export async function GET() {
  try {
    const wallets = await getStoredWallets();
    return NextResponse.json({ success: true, data: wallets });
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
      const resetWallets = { ...DEFAULT_WALLETS, lastUpdated: Date.now() };
      await saveWallets(resetWallets);
      return NextResponse.json({ success: true, data: resetWallets });
    }

    if (typeof body.cashInHand === 'number' && typeof body.accountBalance === 'number') {
      const updated = {
        cashInHand: body.cashInHand,
        accountBalance: body.accountBalance,
        lastUpdated: Date.now(),
      };
      await saveWallets(updated);
      return NextResponse.json({ success: true, data: updated });
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
