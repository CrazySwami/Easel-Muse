import { Liveblocks } from '@liveblocks/node';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    if (!room) return new Response('Missing room', { status: 400 });
    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    // Overwrite the Yjs doc with an empty state
    const empty = new Uint8Array();
    await liveblocks.sendYjsBinaryUpdate(room, empty);
    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('Failed', { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


