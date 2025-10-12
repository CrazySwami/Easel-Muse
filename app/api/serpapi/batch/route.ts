import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { type = 'search', queries = [], location, hl = 'en', gl = 'US' } = await req.json();
    console.log('[SerpApi:BATCH] start', { type, count: Array.isArray(queries) ? queries.length : -1, location, hl, gl });
    if (!Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json({ error: 'Provide queries[]' }, { status: 400 });
    }
    const endpoint = type === 'aio' ? '/api/serpapi/ai-overview' : '/api/serpapi/search';
    const tasks = queries.map(async (q: string) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ q, location, hl, gl }),
        });
        const data = await res.json();
        return { q, ok: true, data };
      } catch (e: any) {
        return { q, ok: false, error: String(e) };
      }
    });
    const results = await Promise.allSettled(tasks);
    console.log('[SerpApi:BATCH] done');
    return NextResponse.json(results.map(r => (r.status === 'fulfilled' ? r.value : { ok: false, error: 'Task failed' })));
  } catch (e: any) {
    console.error('[SerpApi:BATCH] exception', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


