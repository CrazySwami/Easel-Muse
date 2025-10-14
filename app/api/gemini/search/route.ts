'use server';

import { NextResponse } from 'next/server';

// Minimal Gemini search proxy with grounding; graceful fallback without API key
export async function POST(req: Request) {
  try {
    const { q, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    const m = model || 'gemini-2.5-flash-lite';

    if (apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const body: any = {
        contents: [{ role: 'user', parts: [{ text: q }]}],
        tools: [{ google_search: {} }],
      };
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = await res.json();
      return NextResponse.json(json, { status: res.ok ? 200 : 500 });
    }

    // Fallback to SerpApi
    const url = new URL('/api/serpapi/search', req.url);
    const serp = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, hl: 'en', gl: 'US' }) });
    const data = await serp.json();
    return NextResponse.json({
      candidates: [
        {
          content: { parts: [{ text: `No GOOGLE API key set. Showing organic results for: ${q}` }] },
          groundingMetadata: {
            groundingChunks: (Array.isArray(data?.organic_results) ? data.organic_results : []).slice(0, 12).map((r: any) => ({ web: { uri: r?.link, title: r?.title, domain: r?.source || r?.displayed_link } }))
          }
        }
      ]
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

