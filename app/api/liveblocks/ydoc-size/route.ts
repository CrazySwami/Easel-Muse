import { Liveblocks } from '@liveblocks/node';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    if (!room) return new Response(JSON.stringify({ error: 'Missing room' }), { status: 400 });

    // Optional: ensure the room exists in our DB
    const project = await database.query.projects.findFirst({ where: eq(projects.id, room) });
    if (!project) return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });

    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    let bytes = 0;
    try {
      const update = (await liveblocks.getYjsDocumentAsBinaryUpdate(room)) as any;
      if (update) bytes = (update.byteLength as number) ?? (update.length as number) ?? 0;
    } catch {
      // No doc yet
    }
    return new Response(JSON.stringify({ bytes }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


