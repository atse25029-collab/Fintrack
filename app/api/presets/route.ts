import { NextResponse } from 'next/server';
import { QuickPreset } from '@/lib/types';
import { DEFAULT_QUICK_PRESETS } from '@/lib/sampleData';

let inMemoryPresets: QuickPreset[] = [...DEFAULT_QUICK_PRESETS];

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: inMemoryPresets });
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

    if (body.action === 'reset') {
      inMemoryPresets = [...DEFAULT_QUICK_PRESETS];
      return NextResponse.json({ success: true, data: inMemoryPresets });
    }

    if (body.action === 'delete' && body.id) {
      inMemoryPresets = inMemoryPresets.filter((p) => p.id !== body.id);
      return NextResponse.json({ success: true, data: inMemoryPresets });
    }

    if (Array.isArray(body)) {
      inMemoryPresets = body;
      return NextResponse.json({ success: true, data: inMemoryPresets });
    }

    if (body.id && body.label && typeof body.amount === 'number') {
      const existingIdx = inMemoryPresets.findIndex((p) => p.id === body.id);
      if (existingIdx >= 0) {
        inMemoryPresets[existingIdx] = body;
      } else {
        inMemoryPresets.push(body);
      }
      return NextResponse.json({ success: true, data: inMemoryPresets });
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
