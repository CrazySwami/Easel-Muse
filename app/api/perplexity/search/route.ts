'use server';

import { NextResponse } from 'next/server';
import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const perplexity = createOpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: 'https://api.perplexity.ai',
});

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = createOpenAI({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: 'https://api.anthropic.com' });
const google = createOpenAI({ apiKey: process.env.GOOGLE_API_KEY, baseURL: 'https://generativelanguage.googleapis.com' });

function resolveProviderAndModel(model?: string): { provider: 'openai' | 'anthropic' | 'google' | 'perplexity'; model: string } {
  const m = (model ?? '').toLowerCase();
  if (m.includes('claude') || m.includes('anthropic')) {
    return { provider: 'anthropic', model: m.includes('haiku') ? 'claude-3-5-haiku-latest' : 'claude-3-5-sonnet-latest' };
  }
  if (m.includes('gemini') || m.includes('google')) {
    return { provider: 'google', model: m.includes('pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash' };
  }
  if (m.includes('gpt') || m.includes('openai') || m.includes('4o')) {
    return { provider: 'openai', model: m.includes('mini') ? 'gpt-4o-mini' : 'gpt-4o' };
  }
  if (m.includes('sonar') || m.includes('perplexity')) {
    return { provider: 'perplexity', model: 'sonar-small-online' };
  }
  // default to OpenAI mini
  return { provider: 'openai', model: 'gpt-4o-mini' };
}

export async function POST(req: Request) {
  const reqBody = await req.json();
  const { mode } = reqBody as { mode?: string };
  const pxKey = process.env.PERPLEXITY_API_KEY;

  if (!pxKey) {
    return new NextResponse('Missing Perplexity API key', { status: 500 });
  }

  if (mode === 'generate_questions') {
    const { prompt, model } = reqBody as { prompt: string; model?: string };
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return new NextResponse('Missing prompt', { status: 400 });
    }

    const { provider, model: mapped } = resolveProviderAndModel(model);

    if (provider === 'perplexity') {
      return new NextResponse('Perplexity models are not supported for question generation. Choose OpenAI, Anthropic, or Google.', { status: 400 });
    }

    if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
      return new NextResponse('Missing OpenAI API key', { status: 500 });
    }
    if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      return new NextResponse('Missing Anthropic API key', { status: 500 });
    }
    if (provider === 'google' && !process.env.GOOGLE_API_KEY) {
      return new NextResponse('Missing Google API key', { status: 500 });
    }

    const questionsSchema = z.object({ questions: z.array(z.string().min(2)).min(1).max(20) });

    try {
      const client = provider === 'openai' ? openai : provider === 'anthropic' ? anthropic : google;
      const { object } = await generateObject({
        model: client(mapped),
        schema: questionsSchema,
        prompt: `Generate diverse, high-signal search queries related to: "${prompt}". Return ONLY a JSON object: { "questions": string[] } with 5-10 items. No extra text.`,
      });
      return NextResponse.json(object);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new NextResponse(`Internal Server Error: ${errorMessage}`, { status: 500 });
    }
  }

  if (mode === 'search') {
    const { query, max_results, search_domain_filter, max_tokens_per_page, country } = reqBody as any;

    // Batch: array of queries -> fetch each separately and return grouped results
    if (Array.isArray(query)) {
      const baseHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pxKey}`,
      } as const;

      try {
        const groups = await Promise.all(
          query.map(async (q: string) => {
            const payload: any = { query: q };
            if (typeof max_results === 'number') payload.max_results = max_results;
            if (Array.isArray(search_domain_filter)) payload.search_domain_filter = search_domain_filter;
            if (typeof max_tokens_per_page === 'number') payload.max_tokens_per_page = max_tokens_per_page;
            if (typeof country === 'string') payload.country = country;

            const resp = await fetch('https://api.perplexity.ai/search', {
              method: 'POST',
              headers: baseHeaders,
              body: JSON.stringify(payload),
            });
            if (!resp.ok) {
              const errorText = await resp.text();
              throw new Error(`Error for query "${q}": ${errorText}`);
            }
            const data = await resp.json();
            return { query: q, results: data.results ?? [] };
          })
        );

        return NextResponse.json(groups);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new NextResponse(`Error from Perplexity API: ${errorMessage}`, { status: 502 });
      }
    }

    // Single query passthrough
    const payload: any = { query };
    if (typeof max_results === 'number') payload.max_results = max_results;
    if (Array.isArray(search_domain_filter)) payload.search_domain_filter = search_domain_filter;
    if (typeof max_tokens_per_page === 'number') payload.max_tokens_per_page = max_tokens_per_page;
    if (typeof country === 'string') payload.country = country;

    try {
      const response = await fetch('https://api.perplexity.ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pxKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new NextResponse(`Error from Perplexity API: ${errorText}`, { status: response.status });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new NextResponse(`Internal Server Error: ${errorMessage}`, { status: 500 });
    }
  }

  if (mode === 'chat') {
    const { messages, system } = reqBody as any;
    let { model } = reqBody as any;
    if (typeof model !== 'string' || !/sonar|perplexity|online/i.test(model)) {
      model = 'sonar-small-online';
    }
    model = String(model).replace(/^perplexity\//i, '');

    try {
      const chatMessages = Array.isArray(messages) ? messages : [];
      const finalMessages = system ? [{ role: 'system', content: String(system) }, ...chatMessages] : chatMessages;
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pxKey}`,
        },
        body: JSON.stringify({ model, messages: finalMessages }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return new NextResponse(`Error from Perplexity API: ${errorText}`, { status: response.status });
      }

      const data = await response.json();
      // Ensure citations is a top-level array when available
      if (Array.isArray((data as any)?.citations)) {
        return NextResponse.json(data);
      }
      // Some responses include references in choices[0].citations
      const citations = (data as any)?.choices?.[0]?.citations ?? [];
      return NextResponse.json({ ...data, citations });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return new NextResponse(`Internal Server Error: ${errorMessage}`, { status: 500 });
    }
  }

  return new NextResponse('Invalid mode', { status: 400 });
}
