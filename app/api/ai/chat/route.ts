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
    const { messages, provider, apiKey, ollamaUrl, fkgData } = body;

    const userMessage = messages[messages.length - 1]?.content || '';
    const fkg = buildFinancialKnowledgeGraph(fkgData);
    const fkgContext = serializeKnowledgeGraphForLLM(fkg);

    // 1. Check if Gemini Provider requested and API key available
    const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (provider === 'gemini' && geminiKey) {
      try {
        const systemPrompt = `You are FinTrack Copilot, an elite personal finance AI assistant and financial knowledge graph co-pilot.
You have comprehensive, real-time access to the user's live Financial Knowledge Graph below:
${fkgContext}

Guidelines:
1. Ground your answers strictly in the factual data provided in the Financial Knowledge Graph.
2. Be concise, direct, helpful, and numbers-focused (use ₹ symbol for currency).
3. If the user asks to log a transaction or settle a debt, acknowledge the details clearly.
4. Maintain a supportive, minimalist, analytical tone.`;

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: "Understood. I am equipped with your live Financial Knowledge Graph and ready to assist with cashflow, bills, peer tabs, and ledger actions." }] },
          ...messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        ];

        // Call Gemini 2.5 Flash / 2.0 Flash REST API
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const actionProposal = detectActionIntent(userMessage) || undefined;
            return NextResponse.json({
              content: text,
              actionProposal,
              provider: 'gemini-2.0-flash',
            });
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local Knowledge Graph engine:', err);
      }
    }

    // 2. Check if Groq Provider requested
    const groqKey = apiKey || process.env.GROQ_API_KEY;
    if (provider === 'groq' && groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `You are FinTrack Copilot with full knowledge graph access:\n${fkgContext}`,
              },
              ...messages,
            ],
            temperature: 0.4,
            max_tokens: 800,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const text = groqData.choices?.[0]?.message?.content;
          if (text) {
            const actionProposal = detectActionIntent(userMessage) || undefined;
            return NextResponse.json({
              content: text,
              actionProposal,
              provider: 'groq-llama-3.3',
            });
          }
        }
      } catch (err) {
        console.warn('Groq API call failed, falling back:', err);
      }
    }

    // 3. Fallback: Local Knowledge Graph Conversational Engine
    const localRes = generateKnowledgeGraphResponse(userMessage, fkgContext, fkgData);
    return NextResponse.json({
      ...localRes,
      provider: 'knowledge-graph-local',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error processing AI chat request' },
      { status: 500 }
    );
  }
}
