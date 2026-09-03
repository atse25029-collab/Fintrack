import { NextResponse } from 'next/server';
import { getStoredTransactions, saveTransactions, isVercelKvConfigured } from '@/lib/storage/vercelStorage';
import { Transaction } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const { clientTransactions } = await request.json();

    if (!Array.isArray(clientTransactions)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const serverTransactions = await getStoredTransactions();
    const map = new Map<string, Transaction>();

    // Put server transactions first
    serverTransactions.forEach((tx) => map.set(tx.id, tx));

    // Merge or add client transactions (newer timestamp wins)
    clientTransactions.forEach((clientTx: Transaction) => {
      const existing = map.get(clientTx.id);
      if (!existing || (clientTx.createdAt && clientTx.createdAt >= existing.createdAt)) {
        map.set(clientTx.id, { ...clientTx, synced: true });
      }
    });

    const merged = Array.from(map.values()).sort((a, b) => {
      // Sort by date desc, then createdAt desc
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    await saveTransactions(merged);

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      data: merged,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
