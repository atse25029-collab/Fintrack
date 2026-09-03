import { NextResponse } from 'next/server';
import { getStoredBudget, saveBudget, isVercelKvConfigured } from '@/lib/storage/vercelStorage';
import { BudgetConfig } from '@/lib/types';

export async function GET() {
  try {
    const budget = await getStoredBudget();
    return NextResponse.json({
      success: true,
      data: budget,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<BudgetConfig> = await request.json();
    const current = await getStoredBudget();

    const updated: BudgetConfig = {
      monthlyLimit: typeof body.monthlyLimit === 'number' ? body.monthlyLimit : current.monthlyLimit,
      dailyAllowance: typeof body.dailyAllowance === 'number' ? body.dailyAllowance : current.dailyAllowance,
      currency: body.currency || current.currency,
      currencySymbol: body.currencySymbol || current.currencySymbol,
    };

    await saveBudget(updated);

    return NextResponse.json({
      success: true,
      message: 'Budget settings saved',
      data: updated,
      cloudStorage: isVercelKvConfigured ? 'Vercel KV Connected' : 'Local / Memory Fallback',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save budget' },
      { status: 500 }
    );
  }
}
