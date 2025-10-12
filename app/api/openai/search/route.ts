import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

// OpenAI Web Search (Responses API web_search_preview)
// POST body: { q: string }
export async function POST(req: Request) {
  try {
    const { q, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });
    if (!env.OPENAI_API_KEY) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    let res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'responses-2024-10-22',
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini-2024-07-18',
        input: q,
        tools: [{ type: 'web_search_preview' }],
        tool_choice: 'auto',
        parallel_tool_calls: true,
      }),
    });
    // Fallback: try legacy payload without beta header if the above fails
    if (!res.ok) {
      res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini-2024-07-18',
          input: [{ role: 'user', content: q }],
          tools: [{ type: 'web_search_preview' }],
          tool_choice: 'auto',
          parallel_tool_calls: true,
        }),
      });
    }
    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


