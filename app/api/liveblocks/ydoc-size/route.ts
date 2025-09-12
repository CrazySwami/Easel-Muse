import { Liveblocks } from '@liveblocks/node';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    if (!room) return new Response(JSON.stringify({ error: 'Missing room' }), { status: 400 });

    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    let bytes = 0;
    try {
      const update = await liveblocks.getYjsDocumentAsBinaryUpdate(room);
      if (update) bytes = (update as Uint8Array).byteLength ?? (update as any).length ?? 0;
    } catch {
      // If no doc yet, treat as zero
    }
    const limit = 400 * 1024;
    return new Response(JSON.stringify({ bytes, allowed: bytes <= limit }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


