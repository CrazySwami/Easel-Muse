import { NextResponse } from 'next/server';
import { z } from 'zod';

// We assume Firecrawl API key and base URL are present in the environment.
// If the user already integrates the key elsewhere, adapt here when needed.

const BodySchema = z.object({
  id: z.string(),
  data: z.object({
    mode: z.literal('scrape').optional().default('scrape'),
    url: z.string().url().optional(),
    query: z.string().optional(),
    formats: z
      .array(z.enum(['markdown', 'html', 'links', 'screenshot', 'metadata', 'json']))
      .optional(),
    options: z.record(z.any()).optional(),
    emit: z.enum(['markdown', 'html', 'links', 'json']).optional(),
  }),
});

const FIRECRAWL_BASE = 'https://api.firecrawl.dev/v2';

async function callFirecrawl(path: string, init?: RequestInit) {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY is not set');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(init?.headers ?? {}),
  };
  const res = await fetch(`${FIRECRAWL_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Firecrawl error: ${res.status}`);
  }
  return res.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { data } = BodySchema.parse(body);
    const mode = data.mode ?? 'scrape';

    if (mode === 'scrape') {
      if (!data.url) throw new Error('url is required for scrape');
      const payload: any = { url: data.url };
      // Build formats from emit selection unless user provided explicit formats
      if (data.formats && data.formats.length) {
        payload.formats = data.formats;
      } else {
        const emit = data.emit ?? 'markdown';
        if (emit === 'markdown') payload.formats = ['markdown'];
        else if (emit === 'html') payload.formats = ['html'];
        else if (emit === 'links') payload.formats = ['links'];
        else if (emit === 'screenshots') payload.formats = ['screenshot'];
        else if (emit === 'json') payload.formats = ['json'];
        else payload.formats = ['markdown'];
      }
      if (data.options?.onlyMainContent !== undefined) payload.only_main_content = data.options.onlyMainContent;
      if (data.options?.actions) payload.actions = data.options.actions;
      if (data.options?.timeout) payload.timeout = data.options.timeout;
      // If the caller asked for json extraction, Firecrawl expects an object entry
      if ((payload.formats ?? []).includes('json') || data.options?.jsonPrompt || data.options?.prompt) {
        const requested = (data.formats ?? ['markdown']).filter((f) => f !== 'json');
        const jsonPrompt = (data.options as any)?.jsonPrompt ?? (data.options as any)?.prompt;
        const jsonFormat = jsonPrompt ? { type: 'json', prompt: jsonPrompt } : { type: 'json' };
        // If user chose only json ensure array typed entries
        if (!requested.length) payload.formats = [jsonFormat];
        else payload.formats = [...requested, jsonFormat];
      }
      const result = await callFirecrawl('/scrape', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Normalize output
      const docRaw = result?.data ?? {};
      const ownShot = docRaw?.screenshot ? [docRaw.screenshot] : [];
      const actionsScreens = (docRaw?.actions?.screenshots ?? []) as string[];
      const doc = { ...docRaw, screenshots: docRaw?.screenshots ?? [...ownShot, ...actionsScreens] };
      const emit = data.emit ?? 'markdown';
      const response = {
        generated: {
          doc,
          markdown: doc.markdown ?? undefined,
          html: doc.html ?? undefined,
          links: doc.links ?? undefined,
          screenshots: doc.screenshots ?? undefined,
        },
      };
      return NextResponse.json(response);
    }

    throw new Error('Unsupported mode');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new NextResponse(message, { status: 400 });
  }
}

