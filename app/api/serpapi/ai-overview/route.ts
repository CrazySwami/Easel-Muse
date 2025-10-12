import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(req: Request) {
  try {
    const { q, location, hl = 'en', gl = 'US', no_cache = false, google_domain } = await req.json();
    console.log('[SerpApi:AIO] request', { q, location, hl, gl, no_cache, google_domain });
    if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });
    if (!env.SERPAPI_API_KEY) return NextResponse.json({ error: 'SERPAPI_API_KEY not set' }, { status: 500 });

    const searchUrl = new URL('https://serpapi.com/search.json');
    searchUrl.searchParams.set('engine', 'google');
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('hl', String(hl));
    searchUrl.searchParams.set('gl', String(gl));
    if (location) searchUrl.searchParams.set('location', String(location));
    if (no_cache) searchUrl.searchParams.set('no_cache', 'true');
    if (google_domain) searchUrl.searchParams.set('google_domain', String(google_domain));
    searchUrl.searchParams.set('api_key', env.SERPAPI_API_KEY);

    const baseRes = await fetch(searchUrl, { cache: 'no-store' });
    const baseJson = await baseRes.json();
    console.log('[SerpApi:AIO] base search ai_overview keys', Object.keys(baseJson?.ai_overview || {}));
    if (baseJson?.ai_overview?.error) {
      console.log('[SerpApi:AIO] error in base ai_overview', baseJson.ai_overview.error);
      return NextResponse.json({ mode: 'error', message: baseJson.ai_overview.error, search: baseJson });
    }

    const aio = baseJson?.ai_overview;
    const hasEmbedded = aio && (
      Array.isArray(aio?.text_blocks) || Array.isArray(aio?.products) || Array.isArray(aio?.references)
    );
    if (hasEmbedded) {
      console.log('[SerpApi:AIO] embedded ai_overview (text_blocks/products/references)');
      return NextResponse.json({ mode: 'embedded', ai_overview: aio, search: baseJson });
    }

    const token = baseJson?.ai_overview?.page_token || baseJson?.ai_overview_page_token || baseJson?.inline_passages?.ai_overview?.page_token;
    const serpLink = baseJson?.ai_overview?.serpapi_link;
    if (serpLink) {
      console.log('[SerpApi:AIO] serpapi_link detected, fetching', serpLink);
      // Ensure api_key is attached to serpapi_link (some links omit it)
      const linkUrl = new URL(serpLink);
      if (!linkUrl.searchParams.get('api_key')) {
        linkUrl.searchParams.set('api_key', env.SERPAPI_API_KEY);
      }
      const linkRes = await fetch(linkUrl, { cache: 'no-store' });
      const linkJson = await linkRes.json();
      console.log('[SerpApi:AIO] serpapi_link response keys', Object.keys(linkJson || {}));
      return NextResponse.json({ mode: 'link', ai_overview: linkJson, search: baseJson });
    }
    if (token) {
      const aioUrl = new URL('https://serpapi.com/search.json');
      aioUrl.searchParams.set('engine', 'google_ai_overview');
      aioUrl.searchParams.set('page_token', String(token));
      aioUrl.searchParams.set('api_key', env.SERPAPI_API_KEY);
      console.log('[SerpApi:AIO] fetching with page_token');
      const aioRes = await fetch(aioUrl, { cache: 'no-store' });
      const aioJson = await aioRes.json();
      console.log('[SerpApi:AIO] token response keys', Object.keys(aioJson || {}));
      return NextResponse.json({ mode: 'token', ai_overview: aioJson, search: baseJson });
    }

    console.log('[SerpApi:AIO] no ai_overview for query/locale');
    return NextResponse.json({ mode: 'none', message: 'No AI Overview for this query/locale.', search: baseJson });
  } catch (e: any) {
    console.error('[SerpApi:AIO] exception', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}


