import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

// Minimal proxy for Google Gemini with Search Grounding
// POST body: { q: string; urlContext?: string[]; dynamic?: boolean }
export async function POST(req: Request) {
  try {
    const { q, urlContext = [], dynamic = true, model } = await req.json();
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });
    if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY not set' }, { status: 500 });
    }

    const m = model || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${env.GOOGLE_GENERATIVE_AI_API_KEY}`;
    const body: any = {
      contents: [{ role: 'user', parts: [{ text: q }]}],
      tools: [{ google_search: {} }],
    };
    if (Array.isArray(urlContext) && urlContext.length) {
      body.tools.push({ url_context: { urls: urlContext } });
    }
    // Note: some keys like toolConfig.googleSearch may not be accepted on v1beta; rely on default dynamic retrieval.

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    // Provide error details for easier debugging in dev
    if (!res.ok) {
      return NextResponse.json({ error: 'Gemini error', details: json }, { status: res.status });
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


