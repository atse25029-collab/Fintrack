import { NextResponse } from 'next/server';
import { getStoredDues, saveDues, isVercelKvConfigured } from '@/lib/storage/vercelStorage';
import { MonthlyDue } from '@/lib/types';
import { INITIAL_MONTHLY_DUES } from '@/lib/sampleData';

export async function GET() {
  try {
    const dues = await getStoredDues();
    return NextResponse.json({
      success: true,
      data: dues,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dues = await getStoredDues();

    if (body.action === 'delete') {
      const filtered = dues.filter((d) => d.id !== body.id);
      await saveDues(filtered);
      return NextResponse.json({ success: true, message: 'Due deleted', data: filtered });
    }

    if (body.action === 'mark_paid') {
      const today = new Date().toISOString().split('T')[0];
      const updated = dues.map((d) =>
        d.id === body.id
          ? {
              ...d,
              status: 'paid' as const,
              lastPaidDate: today,
            }
          : d
      );
      await saveDues(updated);
      return NextResponse.json({ success: true, message: 'Due marked paid', data: updated });
    }

    if (body.action === 'reset') {
      await saveDues(INITIAL_MONTHLY_DUES);
      return NextResponse.json({ success: true, message: 'Reset dues to sample', data: INITIAL_MONTHLY_DUES });
    }

    // Save or update
    const newDue: MonthlyDue = {
      id: body.id || `due-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: body.title,
      amount: parseFloat(body.amount),
      category: body.category || 'Bills & Utilities',
      dueDayOfMonth: parseInt(body.dueDayOfMonth, 10) || 1,
      paymentMethod: body.paymentMethod || 'UPI / Bank',
      status: body.status || 'pending',
      lastPaidDate: body.lastPaidDate,
      notes: body.notes || '',
    };

    const idx = dues.findIndex((d) => d.id === newDue.id);
    let updated: MonthlyDue[];
    if (idx >= 0) {
      updated = [...dues];
      updated[idx] = newDue;
    } else {
      updated = [newDue, ...dues];
    }

    await saveDues(updated);
    return NextResponse.json({
      success: true,
      message: idx >= 0 ? 'Due updated' : 'Due created',
      data: newDue,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
