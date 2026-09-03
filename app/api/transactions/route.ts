import { NextResponse } from 'next/server';
import { getStoredTransactions, saveTransactions, isVercelKvConfigured } from '@/lib/storage/vercelStorage';
import { Transaction } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date');

    let transactions = await getStoredTransactions();

    if (type) {
      transactions = transactions.filter((t) => t.type === type);
    }
    if (date) {
      transactions = transactions.filter((t) => t.date === date);
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const transactions = await getStoredTransactions();

    if (body.action === 'delete') {
      const filtered = transactions.filter((t) => t.id !== body.id);
      await saveTransactions(filtered);
      return NextResponse.json({ success: true, message: 'Transaction deleted', data: filtered });
    }

    if (body.action === 'reset') {
      const { INITIAL_TRANSACTIONS } = await import('@/lib/sampleData');
      await saveTransactions(INITIAL_TRANSACTIONS);
      return NextResponse.json({ success: true, message: 'Reset to sample data', data: INITIAL_TRANSACTIONS });
    }

    if (body.action === 'clear') {
      await saveTransactions([]);
      return NextResponse.json({ success: true, message: 'All transactions cleared', data: [] });
    }

    // New or updated transaction
    const newTx: Transaction = {
      id: body.id || `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: body.type,
      amount: parseFloat(body.amount),
      category: body.category,
      description: body.description || '',
      date: body.date || new Date().toISOString().split('T')[0],
      time: body.time || new Date().toTimeString().slice(0, 5),
      paymentMethod: body.paymentMethod || 'Card',
      notes: body.notes || '',
      createdAt: body.createdAt || Date.now(),
      synced: true,
    };

    const existingIndex = transactions.findIndex((t) => t.id === newTx.id);
    let updated: Transaction[];

    if (existingIndex >= 0) {
      updated = [...transactions];
      updated[existingIndex] = newTx;
    } else {
      updated = [newTx, ...transactions];
    }

    await saveTransactions(updated);

    return NextResponse.json({
      success: true,
      message: existingIndex >= 0 ? 'Transaction updated' : 'Transaction created',
      data: newTx,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save transaction' },
      { status: 500 }
    );
  }
}
