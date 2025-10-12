import { NextRequest, NextResponse } from 'next/server';

const MAX_HOPS = 5;
const ALLOWED_STARTS = [
  'https://vertexaisearch.cloud.google.com/grounding-api-redirect/',
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  if (!ALLOWED_STARTS.some((p) => url.startsWith(p))) {
    return NextResponse.json({ error: 'blocked url' }, { status: 400 });
  }

  let current = url;
  for (let i = 0; i < MAX_HOPS; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    try {
      const resp = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal,
      });
      clearTimeout(id);

      const location = resp.headers.get('location');
      if (location && resp.status >= 300 && resp.status < 400) {
        try {
          current = new URL(location, current).href;
        } catch {
          current = location;
        }
        continue;
      }

      return NextResponse.json({ finalUrl: current }, { status: 200 });
    } catch (e) {
      // on abort or error, break with last known
      break;
    }
  }

  return NextResponse.json({ error: 'too many redirects' }, { status: 400 });
}


