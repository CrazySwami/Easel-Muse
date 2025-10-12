import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Anthropic Claude Web Search (citations)
// NOTE: Depending on Claude API version, web search is enabled by a tool or message field.
// Here we proxy a minimal call; you may need to adjust per your account's web search enablement.
export async function POST(req: Request) {
  try {
    const { q, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });
    if (!env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        tool_choice: { type: 'auto' },
        messages: [
          { role: 'user', content: q }
        ],
      }),
    });
    const json = await res.json();
    return NextResponse.json(json, { status: res.ok ? 200 : 500 });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


