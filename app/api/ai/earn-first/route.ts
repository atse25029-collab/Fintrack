import { NextRequest, NextResponse } from 'next/server';
import { DynamicSafeSpendChatContext } from '@/lib/types';

interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: DynamicSafeSpendChatContext;
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

    // If no API key is available, generate a warm, human-like deterministic response
    if (!apiKey) {
      const fallbackReply = generateHumanFallbackReply(latestUserMessage, context);
      return NextResponse.json({
        success: true,
        reply: fallbackReply,
        isFallback: true,
        notice:
          'Running in local analysis mode. For full conversational reasoning, add your free Google AI Studio API key in settings or as GEMINI_EARN_FIRST_API_KEY.',
      });
    }

    // Build chronological timeline string
    const timelineStr =
      context.upcomingTimeline && context.upcomingTimeline.length > 0
        ? context.upcomingTimeline
            .map((item) => {
              const countdown =
                item.daysUntilDue === 0
                  ? 'Due Today!'
                  : item.daysUntilDue === 1
                  ? 'Due Tomorrow'
                  : `Due in ${item.daysUntilDue} days (${item.dateStr})`;
              return `• ${item.title}: ₹${item.amount} — ${countdown} [${item.type}]`;
            })
            .join('\n')
        : '• No upcoming dues in the current runway! All clear.';

    const youOweStr =
      context.tabsYouOwe && context.tabsYouOwe.length > 0
        ? context.tabsYouOwe
            .map((t) => `• You owe ${t.personName}: ₹${t.amount} ("${t.description}")`)
            .join('\n')
        : '• Zero friend debts.';

    const owedToYouStr =
      context.tabsOwedToYou && context.tabsOwedToYou.length > 0
        ? context.tabsOwedToYou
            .map((t) => `• ${t.personName} owes you: ₹${t.amount} ("${t.description}")`)
            .join('\n')
        : '• Nobody owes you money currently.';

    const bottleneckStr = context.activeBottleneck
      ? `CRITICAL BOTTLENECK: Your daily spending is paced at ₹${context.activeBottleneck.criticalRate}/day to survive your "${context.activeBottleneck.title}" due in ${context.activeBottleneck.daysUntilDue} days (₹${context.activeBottleneck.amount}).`
      : 'No critical bottleneck due found.';

    const systemPrompt = `You are FinTrack Copilot — the user\'s street-smart, empathetic, and encouraging personal financial partner.
You are NOT a cold, sterile accountant or a calculator script. You NEVER output robotic form letters (like "- Item Cost: ₹X, - Safe Left: ₹Y"). You talk in natural, conversational sentences like a trusted, financially savvy friend who knows their exact money situation and wants them to thrive.

LIVE FINANCIAL REALITY FOR TODAY (${context.date}, ${context.dayOfWeek || 'Today'}):
* CONTINUOUS RUNWAY HORIZON: ${context.runwayDays} days lookahead (NO rigid calendar week resets! We look ahead continuously across upcoming dues).

1. THE FINANCIAL TRIAD:
   A. WHAT THE USER HAS (Real Liquid Funds Right Now):
      - Cash in Hand: ₹${context.wallets.cashInHand}
      - Bank / UPI Balance: ₹${context.wallets.accountBalance}
      - Total Liquid Money Right Now: ₹${context.totalLiquidFunds}
   B. WHAT THE USER EARNED (Recent Logged Income & Shifts):
      - Logged Recent Earnings: ₹${context.earnedRecent}
      - Shifts Completed: ${context.shiftsCompleted} shifts
   C. WHAT THE USER WILL EARN (Projected Shifts Remaining in Runway):
      - Wage Rate Per Shift: ₹${context.expectedWagePerShift}
      - Remaining Planned Shifts To Work: ${context.shiftsRemaining} shifts
      - Estimated Remaining Work Earnings: ₹${context.projectedRemainingIncome}

2. UPCOMING OBLIGATIONS & CHRONOLOGICAL TIMELINE:
${timelineStr}

3. FRIEND TABS:
   - What you owe friends:
${youOweStr}
   - What friends owe you:
${owedToYouStr}

4. ACTIVE BOTTLENECK & SAFE SPEND TODAY:
   - ${bottleneckStr}
   - Daily Safe Target Today: ₹${context.dailyTargetToday}
   - Spent Today: ₹${context.spentToday}
   - Safe Left To Spend Today: ₹${Math.max(0, context.remainingSafeToday)} ${
      context.isOverspentToday ? `(Overspent today by ₹${context.overspentAmount})` : ''
    }

CONVERSATIONAL RULES & PERSONALITY GUIDELINES:
1. CONTINUOUS RUNWAY (NO CALENDAR WEEK BIAS): Never say "it's next week so don't worry about it". If a bill is in 2 days or 4 days, treat it with utmost urgency and precision!
2. ACTIVE BOTTLENECK EXPLANATION: If asked "Why is my daily limit capped?" or "Why can I only spend ₹X?", explain how the upcoming due in 2 or 4 days sets the safe burn rate so they don't run out of cash.
3. THE TRIAD: Whenever relevant, reference what they HAVE (liquid ₹${context.totalLiquidFunds}), what they EARNED (₹${context.earnedRecent}), and what they WILL EARN before their upcoming dues.
4. AFFORDABILITY QUESTIONS ("Can I buy ₹X?", "Can I afford dinner tonight?"):
   - Directly analyze the purchase in context of today's safe spend (₹${context.remainingSafeToday}), their upcoming dues in 2d/4d, and expected shift earnings.
   - If affordable: Give the green light with cheerful confidence.
   - If risky: Explain clearly: *"If you spend ₹X today, you will be short for your [Due Name] (₹[Amount]) coming up in [N] days! Work your next shift (+₹${context.expectedWagePerShift}) first to unlock this cleanly."*
5. KEEP IT SNAPPY: 2-4 short, lively paragraphs. Use emojis thoughtfully. Always format currency in Indian Rupees (₹).`;

    // Format previous messages for Gemini API
    const contents = [];
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
        temperature: 0.6,
        maxOutputTokens: 500,
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
      const fallbackReply = generateHumanFallbackReply(latestUserMessage, context);
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
      const fallbackReply = generateHumanFallbackReply(latestUserMessage, context);
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
    console.error('Safe Spend AI Copilot API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process AI Copilot request' },
      { status: 500 }
    );
  }
}

// Warm, engaging, human-like fallback responses when offline or without API key
function generateHumanFallbackReply(
  userQuery: string,
  context: DynamicSafeSpendChatContext
): string {
  const query = userQuery.toLowerCase();
  const safeLeft = Math.max(0, context.remainingSafeToday);
  const liquid = context.totalLiquidFunds;
  const bottleneck = context.activeBottleneck;
  const shiftWage = context.expectedWagePerShift || 300;

  // 1. Purchase Affordability Question
  const amountMatch = query.match(/(?:₹|rs\.?|inr)?\s*(\d+)/i);
  if (
    amountMatch &&
    (query.includes('afford') ||
      query.includes('buy') ||
      query.includes('spend') ||
      query.includes('dinner') ||
      query.includes('cost') ||
      query.includes('meal'))
  ) {
    const cost = parseInt(amountMatch[1], 10);
    if (cost <= safeLeft) {
      const remainder = safeLeft - cost;
      const bottleneckNote = bottleneck
        ? `\n\nYour upcoming **${bottleneck.title}** (₹${bottleneck.amount} in ${bottleneck.daysUntilDue} days) stays 100% protected!`
        : '';
      return `Go for it! 🎉 You've got ₹${safeLeft} safe to spend today, so dropping ₹${cost} fits comfortably in your daily runway.\n\nEven after this, you'll have ₹${remainder} cushion left today.${bottleneckNote} Enjoy!`;
    } else {
      const deficit = cost - safeLeft;
      const warningTarget = bottleneck
        ? `your **${bottleneck.title}** (₹${bottleneck.amount}) due in **${bottleneck.daysUntilDue} days**`
        : 'your upcoming obligations';

      return `Hold on a moment! 🛑 You only have ₹${safeLeft} safe to spend today, so spending ₹${cost} puts you ₹${deficit} over your safe pace.\n\nYour limit is specifically pacing you to survive ${warningTarget}. If you splurge ₹${cost} today, you risk defaulting when that bill hits.\n\n**Pro-move**: You have ${context.shiftsRemaining} planned shifts left (+₹${shiftWage} each). Log your next shift first, and this purchase becomes completely safe!`;
    }
  }

  // 2. Bottleneck / Why is my safe spend capped?
  if (
    query.includes('why') ||
    query.includes('bottleneck') ||
    query.includes('capped') ||
    query.includes('limit') ||
    query.includes('pace')
  ) {
    if (bottleneck) {
      return `Here's why your daily spend is set to **₹${context.dailyTargetToday}**: 🛡️\n\nYou have **${bottleneck.title}** (₹${bottleneck.amount}) coming up in **${bottleneck.daysUntilDue} days** (${bottleneck.dueDateFormatted}).\n\nTo make sure you arrive on that day with enough cash to pay it without panic, your maximum safe daily burn rate is **₹${bottleneck.criticalRate}/day** (factoring in your liquid funds of ₹${liquid} and expected shift earnings). This guarantees you never get caught short!`;
    }
    return `Your safe spend today is **₹${context.dailyTargetToday}** based on your available liquid cash (₹${liquid}) distributed over your ${context.runwayDays}-day runway, after locking away all upcoming dues!`;
  }

  // 3. Upcoming Dues & Timeline
  if (
    query.includes('due') ||
    query.includes('bill') ||
    query.includes('timeline') ||
    query.includes('upcoming')
  ) {
    const upcoming = context.upcomingTimeline;
    if (upcoming && upcoming.length > 0) {
      const items = upcoming
        .slice(0, 4)
        .map(
          (u) =>
            `• **${u.title}**: ₹${u.amount} — ${
              u.daysUntilDue === 0 ? 'Today!' : u.daysUntilDue === 1 ? 'Tomorrow' : `in ${u.daysUntilDue} days`
            }`
        )
        .join('\n');
      return `Here's your upcoming due timeline 🗓️:\n\n${items}\n\nAll of these obligations are actively protected by the dynamic runway engine so you won't overspend today!`;
    }
    return `Good news! You have zero upcoming dues in your ${context.runwayDays}-day runway. Your funds are clean!`;
  }

  // 4. Have, Earned, Will Earn Triad
  if (
    query.includes('have') ||
    query.includes('earn') ||
    query.includes('triad') ||
    query.includes('status') ||
    query.includes('summary')
  ) {
    return `Here's your 3-Pillar Financial Snapshot 💎:\n\n1. **What You HAVE (Liquid Cash & Bank):** ₹${liquid} (Cash: ₹${context.wallets.cashInHand}, Bank: ₹${context.wallets.accountBalance})\n2. **What You EARNED (Recent Inflows):** ₹${context.earnedRecent} across ${context.shiftsCompleted} completed shifts\n3. **What You WILL EARN (Upcoming Runway):** ~₹${context.projectedRemainingIncome} from ${context.shiftsRemaining} planned shifts\n\nTotal obligations locked in runway: **₹${context.totalObligationsInRunway}**.\n**Safe Left Today:** **₹${safeLeft}**!`;
  }

  // 5. Default General Copilot Check-in
  const bottleneckNote = bottleneck
    ? `Paced for **${bottleneck.title}** (₹${bottleneck.amount}) in **${bottleneck.daysUntilDue} days**.`
    : `Protected across a ${context.runwayDays}-day runway.`;

  return `Hey! Here's your real-time cashflow check-in ⚡:\n\n• **Liquid Cash Available:** ₹${liquid}\n• **Earned Recently:** ₹${context.earnedRecent} (${context.shiftsCompleted} shifts done)\n• **Will Earn Before Dues:** ~₹${context.projectedRemainingIncome} (${context.shiftsRemaining} shifts to work)\n• **Obligations Protected:** ₹${context.totalObligationsInRunway}\n\n👉 **Safe Left Today:** **₹${safeLeft}** (${bottleneckNote})\n\nWhat are you planning today?`;
}
