export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Liveblocks } from '@liveblocks/node';

export async function POST(req: Request) {
  try {
    const { room } = (await req.json().catch(() => ({}))) as { room?: string };
    const qp = new URL(req.url).searchParams.get('room');
    const roomId = room || qp;
    if (!roomId) return new Response(JSON.stringify({ error: 'Missing room id' }), { status: 400 });
    console.log('LB secret present?', !!process.env.LIVEBLOCKS_SECRET_KEY, 'room:', roomId);
    const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    const session = lb.prepareSession('anon');
    session.allow(roomId, session.FULL_ACCESS);
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (err: any) {
    console.error('Liveblocks auth POST error:', err?.message, err?.response?.data);
    return new Response(JSON.stringify({ error: err?.message || 'Authorization failed' }), { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const qp = new URL(req.url).searchParams.get('room');
    if (!qp) return new Response(JSON.stringify({ error: 'Missing room id' }), { status: 400 });
    console.log('LB secret present?', !!process.env.LIVEBLOCKS_SECRET_KEY, 'room:', qp);
    const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    const session = lb.prepareSession('anon');
    session.allow(qp, session.FULL_ACCESS);
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (err: any) {
    console.error('Liveblocks auth GET error:', err?.message, err?.response?.data);
    return new Response(JSON.stringify({ error: err?.message || 'Authorization failed' }), { status: 500 });
  }
}


