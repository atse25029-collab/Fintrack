import { NextResponse } from 'next/server';
import { getStoredTabs, saveTabs, isVercelKvConfigured } from '@/lib/storage/vercelStorage';
import { TabItem } from '@/lib/types';
import { INITIAL_TABS } from '@/lib/sampleData';

export async function GET() {
  try {
    const tabs = await getStoredTabs();
    return NextResponse.json({
      success: true,
      data: tabs,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tabs = await getStoredTabs();

    if (body.action === 'delete') {
      const filtered = tabs.filter((t) => t.id !== body.id);
      await saveTabs(filtered);
      return NextResponse.json({ success: true, message: 'Tab deleted', data: filtered });
    }

    if (body.action === 'settle') {
      const updated = tabs.map((t) =>
        t.id === body.id
          ? {
              ...t,
              status: 'settled' as const,
              settledAt: Date.now(),
            }
          : t
      );
      await saveTabs(updated);
      return NextResponse.json({ success: true, message: 'Tab marked settled', data: updated });
    }

    if (body.action === 'reset') {
      await saveTabs(INITIAL_TABS);
      return NextResponse.json({ success: true, message: 'Reset tabs to sample', data: INITIAL_TABS });
    }

    // Save or update
    const newTab: TabItem = {
      id: body.id || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      personName: body.personName,
      amount: parseFloat(body.amount),
      type: body.type || 'owed_to_you',
      description: body.description || '',
      date: body.date || new Date().toISOString().split('T')[0],
      status: body.status || 'pending',
      settledAt: body.settledAt,
      createdAt: body.createdAt || Date.now(),
      notes: body.notes || '',
    };

    const idx = tabs.findIndex((t) => t.id === newTab.id);
    let updated: TabItem[];
    if (idx >= 0) {
      updated = [...tabs];
      updated[idx] = newTab;
    } else {
      updated = [newTab, ...tabs];
    }

    await saveTabs(updated);
    return NextResponse.json({
      success: true,
      message: idx >= 0 ? 'Tab updated' : 'Tab created',
      data: newTab,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Tab ID is required' }, { status: 400 });
    }
    const tabs = await getStoredTabs();
    const filtered = tabs.filter((t) => t.id !== id);
    await saveTabs(filtered);
    return NextResponse.json({ success: true, message: 'Tab deleted', id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
