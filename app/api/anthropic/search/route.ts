'use server';

import { NextResponse } from 'next/server';

// Claude search proxy; graceful fallback to SerpApi when no key
export async function POST(req: Request) {
  try {
    const { q, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const m = model || 'claude-3-5-sonnet-latest';
    if (apiKey) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: m, max_tokens: 1024, messages: [{ role: 'user', content: q }] }),
      });
      const json = await res.json();
      // Add best-effort citations by scanning the response for URLs
      try {
        const text = JSON.stringify(json ?? {});
        const urls = Array.from(text.matchAll(/https?:\/\/[^\s\)"']+/g)).map((m) => m[0]);
        if (urls.length > 0) {
          return NextResponse.json({ ...json, citations: Array.from(new Set(urls)) }, { status: res.ok ? 200 : 500 });
        }
      } catch {}
      // Fallback: use SerpApi organic links as citations when Claude returns none
      try {
        const url = new URL('/api/serpapi/search', req.url);
        const serp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) });
        const data = await serp.json();
        const organic: any[] = Array.isArray(data?.organic_results) ? data.organic_results : [];
        const links = organic.map((r: any) => r?.link).filter(Boolean);
        return NextResponse.json({ ...json, citations: links }, { status: res.ok ? 200 : 500 });
      } catch {}
      return NextResponse.json(json, { status: res.ok ? 200 : 500 });
    }

    const url = new URL('/api/serpapi/search', req.url);
    const serp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) });
    const data = await serp.json();
    return NextResponse.json({
      content: [{ type: 'text', text: `No ANTHROPIC_API_KEY set. Showing organic results for: ${q}` }],
      citations: (Array.isArray(data?.organic_results) ? data.organic_results : []).map((r: any) => r?.link).filter(Boolean),
      model: m,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

