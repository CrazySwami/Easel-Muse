import { Liveblocks } from '@liveblocks/node';
import * as Y from 'yjs';
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
    // Get current Yjs doc, clear expected keys, and send update
    try {
      const current = await liveblocks.getYjsDocumentAsBinaryUpdate(room);
      const ydoc = new Y.Doc();
      if (current) Y.applyUpdate(ydoc, new Uint8Array(current as any));
      Y.transact(ydoc, () => {
        const nmap = ydoc.getMap('nodesMap') as Y.Map<any>;
        const emap = ydoc.getMap('edgesMap') as Y.Map<any>;
        const norder = ydoc.getArray('nodesOrder') as Y.Array<string>;
        const eorder = ydoc.getArray('edgesOrder') as Y.Array<string>;
        if (nmap) for (const k of Array.from(nmap.keys())) nmap.delete(k);
        if (emap) for (const k of Array.from(emap.keys())) emap.delete(k);
        if (norder && norder.length) norder.delete(0, norder.length);
        if (eorder && eorder.length) eorder.delete(0, eorder.length);
      }, 'reset');
      const update = Y.encodeStateAsUpdate(ydoc);
      await liveblocks.sendYjsBinaryUpdate(room, update);
    } catch {
      // If Yjs is not initialized, treat as success
    }
    return new Response('ok');
  } catch (e) {
    return new Response('Failed', { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


