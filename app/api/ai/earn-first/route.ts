import { NextRequest, NextResponse } from 'next/server';
import { WeeklySafeSpendChatContext } from '@/lib/types';

interface ChatPayload {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: WeeklySafeSpendChatContext;
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

    // Build the system prompt with vibrant, human personality and complete financial awareness
    const duesListStr =
      context.obligations.pendingDues && context.obligations.pendingDues.length > 0
        ? context.obligations.pendingDues
            .map((d) => `• ${d.title}: ₹${d.amount} (Due day ${d.dueDayOfMonth} of month, ${d.category})`)
            .join('\n')
        : '• No pending dues this week! All clear.';

    const youOweStr =
      context.obligations.tabsYouOwe && context.obligations.tabsYouOwe.length > 0
        ? context.obligations.tabsYouOwe
            .map((t) => `• You owe ${t.personName}: ₹${t.amount} ("${t.description}")`)
            .join('\n')
        : '• You have zero friend debts.';

    const owedToYouStr =
      context.obligations.tabsOwedToYou && context.obligations.tabsOwedToYou.length > 0
        ? context.obligations.tabsOwedToYou
            .map((t) => `• ${t.personName} owes you: ₹${t.amount} ("${t.description}")`)
            .join('\n')
        : '• Nobody owes you money currently.';

    const systemPrompt = `You are FinTrack Copilot — the user's street-smart, witty, empathetic, and encouraging personal money partner.
You are NOT a cold, sterile accountant or a calculator script. You NEVER output robotic form letters (like "- Item Cost: ₹X, - Safe Left: ₹Y"). You talk in natural, conversational sentences like a trusted, financially savvy friend who knows their exact money situation and wants them to thrive.

CURRENT LIVE FINANCIAL REALITY FOR TODAY (${context.date}, ${context.dayOfWeek || 'Today'}):
* WEEK CYCLE RULE: The budget week STRICTLY runs from MONDAY to SUNDAY (${context.weekCycleLabel || 'Monday to Sunday'}).
* Current day: ${context.dayOfWeek} (${context.daysRemainingInWeek === 1 ? 'Sunday / Final day of week cycle' : `${context.daysRemainingInWeek} days left until Sunday`}).
* Dues landing strictly this week (before Sunday): ${context.duesDueThisWeekCount} dues totaling ₹${context.duesDueThisWeekTotal}.

1. REAL LIQUID CASH IN HAND & BANK:
   - Cash in Hand: ₹${context.wallets.cashInHand}
   - Bank / UPI Balance: ₹${context.wallets.accountBalance}
   - Total Liquid Money Right Now: ₹${context.totalLiquidFunds}

2. WORK SCHEDULE & ESTIMATED EARNINGS THIS MONDAY–SUNDAY WEEK:
   - Standard Wage Rate Per Shift: ₹${context.workSchedule.expectedWagePerShift}
   - Planned Work Shifts This Week: ${context.workSchedule.plannedWorkShiftsThisWeek} shifts (Total potential: ₹${context.workSchedule.plannedWorkShiftsThisWeek * context.workSchedule.expectedWagePerShift})
   - Shifts Already Completed Since Monday: ${context.workSchedule.shiftsCompletedThisWeek} shifts (Earned so far: ₹${context.workSchedule.earnedThisWeek})
   - Remaining Planned Shifts To Work: ${context.workSchedule.shiftsRemainingThisWeek} shifts
   - Estimated Remaining Work Earnings Yet To Be Earned: ₹${context.workSchedule.remainingExpectedIncome}

3. LOCKED OBLIGATIONS (RING-FENCED SO USER NEVER SHORTFALLS BILLS OR FRIENDS):
   - Total Locked Obligations: ₹${context.obligations.totalLocked}
   - Dues Landing This Week (Mon–Sun): ${context.duesDueThisWeekCount} dues (₹${context.duesDueThisWeekTotal})
   - All Pending Dues (${context.obligations.pendingDuesCount} dues, ₹${context.obligations.pendingDuesTotal}):
${duesListStr}
   - Friend Tabs You Owe:
${youOweStr}
   - Money Friends Owe You:
${owedToYouStr}

4. WEEKLY DISCRETIONARY POOL & TODAY'S SAFE LIMIT:
   - Net Weekly Safe Pool: ₹${context.netWeeklySafePool} (Calculated as Liquid ₹${context.totalLiquidFunds} + Est. Work Income ₹${context.workSchedule.remainingExpectedIncome} - Locked Obligations ₹${context.obligations.totalLocked})
   - Days Remaining in Current Monday–Sunday Week: ${context.daysRemainingInWeek} days (including today)
   - Today's Target Allowance: ₹${context.dailyTargetToday}
   - Already Spent Today: ₹${context.spentToday}
   - Safe Left To Spend Today: ₹${Math.max(0, context.remainingSafeToday)} ${
      context.isOverspentToday ? `(Overspent today by ₹${context.overspentAmount})` : ''
    }

CONVERSATIONAL RULES & PERSONALITY GUIDELINES:
1. TALK LIKE A HUMAN: Use natural, punchy, conversational prose with warmth and relatable humor. Avoid repeating standard bulleted tables.
2. WEEK CYCLE AWARENESS: The week ALWAYS starts on Monday and ends on Sunday. If asked about the week or today, always frame it within this Monday-to-Sunday horizon.
3. DUES THIS WEEK: If asked "how many dues do I have left this week", specifically state the ${context.duesDueThisWeekCount} dues landing before Sunday, while assuring them that ALL dues are ring-fenced.
4. ESTIMATED EARNINGS THIS WEEK: If asked how much they will earn this week, clearly explain the planned shifts (${context.workSchedule.plannedWorkShiftsThisWeek} shifts @ ₹${context.workSchedule.expectedWagePerShift} = ₹${context.workSchedule.plannedWorkShiftsThisWeek * context.workSchedule.expectedWagePerShift}), how many are completed (${context.workSchedule.shiftsCompletedThisWeek} shifts, ₹${context.workSchedule.earnedThisWeek}), and remaining to earn (₹${context.workSchedule.remainingExpectedIncome}).
5. AFFORDABILITY QUESTIONS ("Can I buy ₹X?", "Can I afford dinner tonight?"):
   - Directly analyze the purchase in context of their current liquid cash, their locked bills/debts, and remaining work shifts.
   - If affordable: Celebrate and give the green light with confidence (*"Go for it! You've got ₹${context.remainingSafeToday} safe to spend today..."*).
   - If unaffordable or risky: Give a friendly, candid reality-check without being preachy. Tell them exactly which bills or friend debts would be at risk, and remind them that working their next planned shift (+₹${context.workSchedule.expectedWagePerShift}) will unlock the purchase cleanly.
6. REST-DAY & DAY-OFF QUESTIONS ("Can I take tomorrow off?"):
   - Look at their shift progress (${context.workSchedule.shiftsCompletedThisWeek} of ${context.workSchedule.plannedWorkShiftsThisWeek} shifts done).
   - Calculate how dropping a shift impacts the weekly pool and explain it encouragingly.
7. OBLIGATIONS & DEBT DIAGNOSTICS:
   - If asked about dues or tabs, cite the specific names, amounts, and dates from the list above.
8. KEEP IT SNAPPY: 2-4 short, lively paragraphs. Use emojis thoughtfully. Always format currency in Indian Rupees (₹).`;

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
        temperature: 0.6, // slightly higher temperature for livelier, more human conversational flair
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
  context: WeeklySafeSpendChatContext
): string {
  const query = userQuery.toLowerCase();
  const safeLeft = Math.max(0, context.remainingSafeToday);
  const shiftWage = context.workSchedule.expectedWagePerShift || 300;
  const liquid = context.totalLiquidFunds;
  const locked = context.obligations.totalLocked;

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
      return `Go for it! 🎉 You've got ₹${safeLeft} safe to spend today, so dropping ₹${cost} fits comfortably in your budget.\n\nEven after this, you'll still have ₹${remainder} cushion today, and all ₹${locked} of your upcoming dues and friend debts stay 100% protected. Enjoy!`;
    } else {
      const deficit = cost - safeLeft;
      return `Hold up for a second! 🛑 You only have ₹${safeLeft} safe to spend today, so spending ₹${cost} will put you ₹${deficit} in the red.\n\nRemember, you've got ₹${locked} locked away for your bills and debts. If you buy this now, tomorrow's safe spend will take a hit. **Pro-move**: You still have ${context.workSchedule.shiftsRemainingThisWeek} planned shifts this week (+₹${shiftWage} each). Knock out your next shift first, and this purchase will be completely guilt-free!`;
    }
  }

  // 2. Day off / Rest day planning
  if (
    query.includes('rest') ||
    query.includes('off') ||
    query.includes('holiday') ||
    query.includes('leave') ||
    query.includes('tomorrow')
  ) {
    if (context.workSchedule.shiftsCompletedThisWeek >= 3 || context.netWeeklySafePool > 1000) {
      return `You've earned it! 🛋️ You've already knocked out ${context.workSchedule.shiftsCompletedThisWeek} shifts this week (₹${context.workSchedule.earnedThisWeek} earned). Even if you take tomorrow off, your remaining weekly safe pool sits at a healthy ₹${context.netWeeklySafePool}.\n\nKick back, recharge, and don't sweat it. Your bills are covered!`;
    } else {
      return `You *can* take tomorrow off, but keep it lean! 👀 You've completed ${context.workSchedule.shiftsCompletedThisWeek} of your ${context.workSchedule.plannedWorkShiftsThisWeek} planned shifts so far. Dropping tomorrow's shift means your daily safe spend will tighten up from ₹${context.dailyTargetToday} to about ₹${Math.max(
        0,
        Math.round((context.netWeeklySafePool - shiftWage) / Math.max(1, context.daysRemainingInWeek - 1))
      )} for the rest of the week.\n\nIf you take the day off, just watch non-essential expenses!`;
    }
  }

  // 3. Dues landing this week specifically
  if (
    (query.includes('due') || query.includes('bill')) &&
    (query.includes('this week') || query.includes('left') || query.includes('how many'))
  ) {
    if (context.duesDueThisWeekCount > 0) {
      return `You have **${context.duesDueThisWeekCount} monthly bill${context.duesDueThisWeekCount === 1 ? '' : 's'}** landing this week (before Sunday), totaling **₹${context.duesDueThisWeekTotal}** 🗓️.\n\nAll ${context.obligations.pendingDuesCount} upcoming dues (₹${context.obligations.pendingDuesTotal}) and friend debts (₹${context.obligations.pendingTabsTotal}) are already 100% ring-fenced from your ₹${liquid} liquid cash, so your bills will never bounce!`;
    } else {
      return `Good news! 🎉 You have **0 monthly bills landing this week** (before Sunday). Any other dues fall later in the month, and we've already ring-fenced all ₹${locked} of your upcoming dues and friend tabs from your ₹${liquid} liquid cash so you're totally safe!`;
    }
  }

  // 4. Dues & Debt breakdown
  if (query.includes('due') || query.includes('tab') || query.includes('debt') || query.includes('lock')) {
    const dueCount = context.obligations.pendingDuesCount;
    const tabCount = context.obligations.pendingTabsCount;
    return `Here's your debt snapshot 🔒: We're ring-fencing a total of **₹${locked}** right now.\n\n- **Monthly Dues (${dueCount})**: Totaling ₹${context.obligations.pendingDuesTotal}\n- **Friend Tabs You Owe (${tabCount})**: Totaling ₹${context.obligations.pendingTabsTotal}\n\nThis money is completely sealed off from your liquid funds (₹${liquid}), so you never have to panic when due dates land!`;
  }

  // 5. Work & Estimated Earnings this week
  if (query.includes('earn') || query.includes('income') || query.includes('wage') || query.includes('shift')) {
    return `Here's your earnings breakdown for this Monday–Sunday week (${context.weekCycleLabel || 'this week'}) 💼:\n\n• **Weekly Plan:** ${context.workSchedule.plannedWorkShiftsThisWeek} shifts @ ₹${shiftWage} = **₹${context.workSchedule.plannedWorkShiftsThisWeek * shiftWage}**\n• **Earned Since Monday:** ₹${context.workSchedule.earnedThisWeek} (${context.workSchedule.shiftsCompletedThisWeek} shifts done)\n• **Remaining to Earn Before Sunday:** **₹${context.workSchedule.remainingExpectedIncome}** (${context.workSchedule.shiftsRemainingThisWeek} shifts left)\n\nEvery time you log a shift or inflow, it feeds directly into your liquid cash!`;
  }

  // 6. General Monday-to-Sunday week check-in
  const cycleStatus = context.isSunday
    ? 'Today is Sunday—the final day of this Monday–Sunday cycle!'
    : `We're on ${context.dayOfWeek}, with ${context.daysRemainingInWeek} days left until this cycle wraps up on Sunday.`;

  return `Hey! Here's how your **Monday–Sunday week** is shaping up 📊 (${cycleStatus}):\n\nYou've got **₹${liquid}** total in your accounts. After locking away **₹${locked}** for your bills and debts, plus factoring in your **${context.workSchedule.shiftsRemainingThisWeek} planned shifts** left this week (+₹${context.workSchedule.remainingExpectedIncome}), your weekly safe discretionary pool is **₹${context.netWeeklySafePool}**.\n\nThat gives you **₹${safeLeft}** safe to spend today! What are you planning to do?`;
}
