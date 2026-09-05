import { NextResponse } from 'next/server';
import { getStoredPresets, savePresets } from '@/lib/storage/vercelStorage';
import { DEFAULT_QUICK_PRESETS } from '@/lib/sampleData';

export async function GET() {
  try {
    const presets = await getStoredPresets();
    return NextResponse.json({ success: true, data: presets });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch presets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const presets = await getStoredPresets();

    if (body.action === 'reset') {
      await savePresets(DEFAULT_QUICK_PRESETS);
      return NextResponse.json({ success: true, data: DEFAULT_QUICK_PRESETS });
    }

    if (body.action === 'delete' && body.id) {
      const filtered = presets.filter((p) => p.id !== body.id);
      await savePresets(filtered);
      return NextResponse.json({ success: true, data: filtered });
    }

    if (Array.isArray(body)) {
      await savePresets(body);
      return NextResponse.json({ success: true, data: body });
    }

    if (body.id && body.label && typeof body.amount === 'number') {
      const existingIdx = presets.findIndex((p) => p.id === body.id);
      let updated = [...presets];
      if (existingIdx >= 0) {
        updated[existingIdx] = body;
      } else {
        updated.push(body);
      }
      await savePresets(updated);
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid preset data' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update presets' },
      { status: 500 }
    );
  }
}
