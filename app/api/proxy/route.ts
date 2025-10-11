'use server';

import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url', { status: 400 });
  }
  try {
    const res = await fetch(url as string, { next: { revalidate: 0 }, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const text = await res.text();
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  } catch (e) {
    return new NextResponse('Failed to fetch', { status: 500 });
  }
}


