'use server';

import { NextResponse } from 'next/server';

// OpenAI Web Search (Responses API web_search_preview) with graceful fallback
// POST body: { q: string, model?: string }
export async function POST(req: Request) {
  try {
    const { q, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      let res = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'responses-2024-10-22',
        },
        body: JSON.stringify({
          model: model || 'gpt-4.1-mini',
          input: q,
          tools: [{ type: 'web_search_preview' }],
          tool_choice: 'auto',
          parallel_tool_calls: true,
        }),
      });
      // Fallback: try without beta header if needed
      if (!res.ok) {
        res = await fetch('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || 'gpt-4.1-mini',
            input: [{ role: 'user', content: q }],
            tools: [{ type: 'web_search_preview' }],
            tool_choice: 'auto',
            parallel_tool_calls: true,
          }),
        });
      }
      const json = await res.json();
      return NextResponse.json(json, { status: res.ok ? 200 : 500 });
    }

    // No API key: return a synthetic summary using SerpApi results so UI still works
    const url = new URL('/api/serpapi/search', req.url);
    const serp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) });
    const data = await serp.json();
    const organic: any[] = Array.isArray(data?.organic_results) ? data.organic_results : [];
    const links: string[] = organic.map((r: any) => r?.link).filter(Boolean);
    const summary = organic.slice(0, 6).map((r: any) => [r?.title, r?.link].filter(Boolean).join(' — ')).join('\n');
    return NextResponse.json({
      model: model || 'gpt-4.1-mini',
      output_text: summary,
      citations: links,
      organic_results: organic,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

