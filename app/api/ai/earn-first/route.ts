import { NextRequest, NextResponse } from 'next/server';
import { EarnFirstChatContext } from '@/lib/types';

interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: EarnFirstChatContext;
  customApiKey?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatPayload = await req.json();
    const { messages, context, customApiKey } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const latestUserMessage = messages[messages.length - 1].content;

    // Resolve API key with priority:
    // 1. Custom key provided by user in settings/chat modal
    // 2. Dedicated GEMINI_EARN_FIRST_API_KEY
    // 3. GEMINI_API_KEY
    // 4. GOOGLE_API_KEY
    // 5. NEXT_PUBLIC_GEMINI_API_KEY
    const apiKey =
      (customApiKey && customApiKey.trim().length > 10 ? customApiKey.trim() : null) ||
      process.env.GEMINI_EARN_FIRST_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // If no API key is available, generate an intelligent mathematical fallback response
    if (!apiKey) {
      const fallbackReply = generateSmartFallbackReply(latestUserMessage, context);
      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        isFallback: true,
        notice:
          'Running in local analysis mode. For full conversational reasoning, add your free Google AI Studio API key in settings or as GEMINI_EARN_FIRST_API_KEY.',
      });
    }

    // Build the system prompt with live Earn-First financial variables
    const systemPrompt = `You are FinTrack's Earn-First AI Financial Copilot — an empathetic, hyper-accurate personal money strategist designed for daily wage earners, freelancers, and smart budgeters.

LIVE FINANCIAL CONTEXT FOR TODAY (${context.date}):
- Safe Left to Spend Today: ₹${context.remainingToday}
- Today's Total Allowance: ₹${context.totalAllowanceToday} (Base Pocket Inflow: ₹${context.basePocketAllowance}, Carried Rollover: ${context.carriedRollover >= 0 ? '+' : ''}₹${context.carriedRollover})
- Spent Today (Non-Due Expenses): ₹${context.spentToday}
- Percent of Safe Limit Used: ${context.percentUsed}%
- Total Inflows/Earnings Today: ₹${context.totalIncomeToday} across ${context.incomeCountToday || 0} stream(s)
- Itemized Inflows: ${
      context.incomeItemsToday && context.incomeItemsToday.length > 0
        ? context.incomeItemsToday
            .map((i) => `"${i.description}": +₹${i.amount} (${i.category}, via ${i.paymentMethod})`)
            .join(', ')
        : 'No earnings logged yet today'
    }
- Dues Shield Reserved Today: ₹${context.duesShieldToday} (protects rent/fixed bills from being spent)
- Rest-Day Cushion Buffer: ₹${context.restDayCushion} (accumulated surplus for off-days)
- Weekly Net Rollover: ${context.weeklyNetRollover >= 0 ? '+' : ''}₹${context.weeklyNetRollover}
- Monthly Net Rollover: ${context.monthlyNetRollover >= 0 ? '+' : ''}₹${context.monthlyNetRollover}
- Today is Rest Day: ${context.isRestDay ? 'YES (Rest Mode active)' : 'NO (Work day)'}
- Next Urgent Due: ${
      context.nextUrgentDue
        ? `${context.nextUrgentDue.title} (₹${context.nextUrgentDue.amount}) due in ${context.nextUrgentDue.daysLeft} days (Daily urgency cut: ₹${context.nextUrgentDue.dailyUrgencyCut})`
        : 'None pending this week'
    }
- Current Wallets: Cash in Hand: ₹${context.wallets?.cashInHand ?? 0}, Bank/UPI: ₹${context.wallets?.accountBalance ?? 0} (Total Liquid Cash: ₹${
      (context.wallets?.cashInHand ?? 0) + (context.wallets?.accountBalance ?? 0)
    })
- Settings: Expected Daily Shift Wage: ₹${context.config?.expectedDailyWage ?? 200}, Work Factor: ${Math.round(
      (context.config?.workFactor ?? 0.7) * 100
    )}%, Dues Reserve Cap: ${context.config?.duesReserveCapPercent || 40}%

CORE BEHAVIORAL DIRECTIVES:
1. Ground every answer in the live numbers above. Always use Indian Rupee (₹) formatting.
2. Purchase Affordability ("Can I buy ₹X?"):
   - Compare ₹X directly to "Safe Left to Spend Today" (₹${context.remainingToday}).
   - If ₹X <= remainingToday: Give a clear "Yes!" and show what will remain.
   - If ₹X > remainingToday: Clearly state they are short. Explain that spending it now causes a deficit that rollover penalizes tomorrow, OR tell them how much additional income/shift they need to log first to afford it cleanly.
3. Rest Day Advice ("Can I take tomorrow off?"):
   - Check the Rest-Day Cushion (₹${context.restDayCushion}) and Weekly Net (₹${context.weeklyNetRollover}).
   - Reassure the user that the attendance model anticipates rest days without guilt.
4. Dues Shield Explanation:
   - Explain that the Dues Shield automatically protects upcoming bills so they don't face an emergency when rent or utility due dates arrive.
5. Tone: Concise, encouraging, street-smart, realistic. Use short paragraphs or quick bullet points.`;

    // Format previous messages for Gemini API
    const contents = [];

    // Include recent conversational turns (last 6 messages max)
    const recentMessages = messages.slice(-6);
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini 2.5 Flash API error response:', errText);
      // Fall back to rule-based analysis
      const fallbackReply = generateSmartFallbackReply(latestUserMessage, context);
      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        isFallback: true,
        notice: 'Note: Gemini API returned a rate limit or key error. Using built-in financial analysis.',
      });
    }

    const result = await response.json();
    const candidateText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      const fallbackReply = generateSmartFallbackReply(latestUserMessage, context);
      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        isFallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      reply: candidateText.trim(),
      isFallback: false,
    });
  } catch (error: any) {
    console.error('Earn-First AI Copilot API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI Copilot request' },
      { status: 500 }
    );
  }
}

// Smart deterministic fallback when API key is missing or offline
function generateSmartFallbackReply(
  userQuery: string,
  context: EarnFirstChatContext
): string {
  const query = userQuery.toLowerCase();
  const safeLeft = Math.max(0, context.remainingToday);

  // 1. Purchase Affordability Question
  const amountMatch = query.match(/(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (amountMatch && (query.includes('afford') || query.includes('buy') || query.includes('spend') || query.includes('dinner') || query.includes('cost'))) {
    const cost = parseInt(amountMatch[1], 10);
    if (cost <= safeLeft) {
      const remainder = safeLeft - cost;
      return `✅ **Yes, you can comfortably afford this!**\n\n- **Item Cost:** ₹${cost}\n- **Safe Left Today:** ₹${safeLeft}\n- **Remaining After Purchase:** ₹${remainder}\n\nYour purchase is 100% within your safe daily allowance, and your upcoming bills (Dues Shield: ₹${context.duesShieldToday}) remain fully protected.`;
    } else {
      const deficit = cost - safeLeft;
      const expectedShift = context.config?.expectedDailyWage || 200;
      return `⚠️ **Caution: Spending ₹${cost} will exceed your safe allowance today.**\n\n- **Safe Left Today:** ₹${safeLeft}\n- **Shortfall:** ₹${deficit}\n\nIf you buy this now, the ₹${deficit} overspend will roll over into tomorrow's allowance. **Pro Tip:** Log a quick half-shift (+₹${Math.round(
        expectedShift / 2
      )}) or an inflow first to bring your safe spend into the green!`;
    }
  }

  // 2. Rest Day Question
  if (query.includes('rest') || query.includes('off') || query.includes('holiday') || query.includes('leave')) {
    if (context.restDayCushion > 100 || context.weeklyNetRollover >= 0) {
      const workPct = Math.round((context.config?.workFactor ?? 0.7) * 100);
      return `🛋️ **Yes, you can safely take time off!**\n\n- **Rest-Day Cushion Fund:** ₹${context.restDayCushion}\n- **Weekly Net Rollover:** ${context.weeklyNetRollover >= 0 ? '+' : ''}₹${context.weeklyNetRollover}\n\nThe Earn-First engine factors in a ${workPct}% attendance schedule so your off-days are pre-cushioned. Enjoy your rest without guilt!`;
    } else {
      return `⚠️ **Your cushion is currently lean:**\n\n- **Cushion Fund:** ₹${context.restDayCushion}\n- **Weekly Rollover:** ₹${context.weeklyNetRollover}\n\nYou can still rest, but keep expenses strictly under ₹${safeLeft} so you don't accumulate a deficit heading into next week.`;
    }
  }

  // 3. Safe Spend Diagnostics
  if (query.includes('why') || query.includes('how') || query.includes('explain') || query.includes('calculate')) {
    const expectedShift = context.config?.expectedDailyWage || 200;
    return `📊 **Earn-First Diagnostic Breakdown:**\n\n1. **Total Inflows Today:** +₹${context.totalIncomeToday} (${context.incomeCountToday} stream(s))\n2. **Dues Shield Reserved:** -₹${context.duesShieldToday} (locked away for bills)\n3. **Pocket Allowance:** ₹${context.basePocketAllowance}\n4. **Carried Rollover:** ${context.carriedRollover >= 0 ? '+' : ''}₹${context.carriedRollover}\n5. **Spent Today:** -₹${context.spentToday}\n\n👉 **Safe Left Today:** **₹${safeLeft}**\n\nTo increase your safe spend, tap "+₹${expectedShift} Shift" or "+ Log Inflow" on your home screen.`;
  }

  // 4. Default Summary
  return `🤖 **Earn-First Copilot:**\n\n- **Safe Left to Spend Today:** ₹${safeLeft}\n- **Earned Today:** ₹${context.totalIncomeToday}\n- **Dues Shielded:** ₹${context.duesShieldToday}\n- **Rest Cushion:** ₹${context.restDayCushion}\n\nAsk me anything like *"Can I afford a ₹180 dinner?"*, *"Can I take tomorrow off?"*, or *"Why is my safe spend ₹${safeLeft}?"*!`;
}
