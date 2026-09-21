import { NextRequest, NextResponse } from 'next/server';
import {
  ChatRequestPayload,
  generateKnowledgeGraphResponse,
  detectActionIntent,
} from '@/lib/ai/aiService';
import {
  buildFinancialKnowledgeGraph,
  serializeKnowledgeGraphForLLM,
} from '@/lib/ai/knowledgeGraph';

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestPayload = await req.json();
    const { messages, apiKey, fkgData } = body;

    const userMessage = messages[messages.length - 1]?.content || '';
    const fkg = buildFinancialKnowledgeGraph(fkgData);
    const fkgContext = serializeKnowledgeGraphForLLM(fkg);

    // Resolve Gemini API key with priority:
    // 1. Client-supplied key (persisted in user's localStorage)
    // 2. Server-side environment variables
    const geminiKey =
      (apiKey && apiKey.trim().length > 5 ? apiKey.trim() : null) ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    // Detect if user is asking to log a transaction or settle a debt
    const actionProposal = detectActionIntent(userMessage) || undefined;

    if (geminiKey) {
      const systemPrompt = `You are FinTrack AI Copilot, an elite intelligent assistant powered by Google Gemini.
You possess real-time, comprehensive access to the user's live Financial Knowledge Graph:
${fkgContext}

YOUR CAPABILITIES & GUIDELINES:
1. FULL GEMINI CHATBOT EXPERIENCE:
   - You are a general-purpose, state-of-the-art conversational AI chatbot powered by Google Gemini.
   - You can answer ANY question the user asks: general knowledge, history, philosophy, coding, mathematics, science, life advice, recipes, creative writing, trivia, health, and open-ended conversation.
   - NEVER refuse to answer a question simply because it is not about personal finance. Answer all queries helpfully, accurately, and naturally just like the standard Google Gemini chatbot!

2. DEEP PERSONAL FINANCIAL AWARENESS:
   - When the user asks about their finances, spending, balances, dues, debt tabs, savings, or whether they can afford a purchase, ground your calculations in the Financial Knowledge Graph provided above.
   - Give accurate calculations, specific numbers, and always format Indian currency with the ₹ symbol (e.g. ₹1,500).
   - Compare what they HAVE (liquid Cash in Hand + Bank) against what they OWE in upcoming dues before approving big purchases.

3. TRANSACTION & DEBT ACTION RECOGNITION:
   - If the user mentions spending money, receiving money, or paying back a friend (e.g. "spent 120 on chai in cash", "paid rahul 500 via upi", "log 450 for groceries"), acknowledge the amount, category, and payment method clearly. FinTrack will automatically render a 1-tap confirmation card for them.

4. TONE & FORMATTING:
   - Direct, friendly, intelligent, and concise. Use clean markdown formatting, bold highlights, and bullet points where helpful.`;

      // Filter and format message history for Gemini API
      // Ensure alternating roles and valid content
      const recentMessages = messages.slice(-10);
      const contents = recentMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content || ' ' }],
      }));

      // Candidate Gemini models in order of preference
      const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
      let lastErrorText = '';

      for (const model of modelsToTry) {
        try {
          const payload = {
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1200,
            },
          };

          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return NextResponse.json({
                content: text,
                actionProposal,
                provider: `gemini (${model})`,
              });
            }
          } else {
            lastErrorText = await geminiRes.text();
            console.warn(`Gemini model ${model} failed (${geminiRes.status}):`, lastErrorText);
          }
        } catch (err: any) {
          lastErrorText = err?.message || 'Network error';
          console.warn(`Gemini model ${model} request error:`, err);
        }
      }

      // If all Gemini models returned an error, return informative message with error context
      console.error('All Gemini model endpoints failed:', lastErrorText);
      const isKeyInvalid = lastErrorText.includes('API_KEY_INVALID') || lastErrorText.includes('PERMISSION_DENIED');

      return NextResponse.json({
        content: isKeyInvalid
          ? `⚠️ **Gemini API Key Error**: The provided Google Gemini API key appears invalid or expired. Please verify your key at [Google AI Studio](https://aistudio.google.com/) and update it via the **Gemini Key** icon in the header.\n\nIn the meantime, your offline financial ledger calculations are active.`
          : `⚠️ **Gemini Service Notice**: Google Gemini service returned a temporary error (${lastErrorText.slice(0, 100)}). Please check your connection or key settings.`,
        actionProposal,
        provider: 'gemini-error',
      });
    }

    // 2. Fallback: Local Knowledge Graph Conversational Engine (when no Gemini key is set yet)
    const localRes = generateKnowledgeGraphResponse(userMessage, fkgContext, fkgData);
    return NextResponse.json({
      ...localRes,
      actionProposal: actionProposal || localRes.actionProposal,
      provider: 'knowledge-graph-local',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/chat:', err);
    return NextResponse.json(
      { error: err.message || 'Error processing AI chat request' },
      { status: 500 }
    );
  }
}
