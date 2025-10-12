import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const { q, location, hl = 'en', gl = 'US', num = 10, no_cache = false, google_domain } = await req.json();
    console.log('[SerpApi:SEARCH] request', { q, location, hl, gl, num, no_cache, google_domain });
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', q);
    url.searchParams.set('hl', String(hl));
    url.searchParams.set('gl', String(gl));
    url.searchParams.set('num', String(num));
    if (location) url.searchParams.set('location', String(location));
    if (google_domain) url.searchParams.set('google_domain', String(google_domain));
    if (no_cache) url.searchParams.set('no_cache', 'true');
    if (!env.SERPAPI_API_KEY) return NextResponse.json({ error: 'SERPAPI_API_KEY not set' }, { status: 500 });
    url.searchParams.set('api_key', env.SERPAPI_API_KEY);

    const res = await fetch(url, { cache: 'no-store' });
    const json = await res.json();
    if (json?.error) {
      console.warn('[SerpApi:SEARCH] error', json.error);
    }
    console.log('[SerpApi:SEARCH] organic_results length', Array.isArray(json?.organic_results) ? json.organic_results.length : -1);
    return NextResponse.json(json);
  } catch (e: any) {
    console.error('[SerpApi:SEARCH] exception', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


