import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') ?? '';
    const limit = searchParams.get('limit') ?? '10';
    const url = new URL('https://serpapi.com/locations.json');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', limit);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json([], { status: 200 });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json([], { status: 200 });
  }
}



