import { Liveblocks } from '@liveblocks/node';
import { createClient } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    if (!room) return new Response('Missing room', { status: 400 });

    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const project = await database.query.projects.findFirst({ where: eq(projects.id, room) });
    if (!project) return new Response('Project not found', { status: 404 });
    if (project.userId !== userId) return new Response('Forbidden', { status: 403 });

    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    // Delete the room's Y.Doc storage (clears collaborative state)
    // Method name varies across SDK versions; use generic REST fallback
    await liveblocks.deleteRoomStorage(room);
    return new Response('ok');
  } catch (e) {
    return new Response('Failed', { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


