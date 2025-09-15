import { Liveblocks } from '@liveblocks/node';
import * as Y from 'yjs';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    if (!room) {
      return new Response(JSON.stringify({ error: 'Missing room' }), { status: 400 });
    }

    // Load the latest project.content to seed a fresh doc
    const project = await database.query.projects.findFirst({ where: eq(projects.id, room) });
    if (!project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }

    const content = (project.content as any) ?? { nodes: [], edges: [] };
    const nodes: any[] = Array.isArray(content.nodes) ? content.nodes : [];
    const edges: any[] = Array.isArray(content.edges) ? content.edges : [];

    // Build a minimal Y.Doc containing only structure
    const doc = new Y.Doc();
    const yNodesMap = doc.getMap<any>('nodesMap');
    const yNodesOrder = doc.getArray<string>('nodesOrder');
    const yEdgesMap = doc.getMap<any>('edgesMap');
    const yEdgesOrder = doc.getArray<string>('edgesOrder');

    const minNode = (n: any) => ({ id: n.id, type: n.type, position: { x: Math.round(n?.position?.x ?? 0), y: Math.round(n?.position?.y ?? 0) } });
    const minEdge = (e: any) => ({ id: e.id, source: e.source, target: e.target, type: e.type, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle });

    for (const n of nodes) yNodesMap.set(n.id, minNode(n));
    if (nodes.length) yNodesOrder.insert(0, nodes.map((n) => n.id));
    for (const e of edges) yEdgesMap.set(e.id, minEdge(e));
    if (edges.length) yEdgesOrder.insert(0, edges.map((e) => e.id));

    const update = Y.encodeStateAsUpdate(doc);

    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

    // Delete existing storage to drop history; ignore if it doesn't exist
    try { await liveblocks.deleteRoom(room); } catch {}

    // Send the compact state
    await liveblocks.sendYjsBinaryUpdate(room, update);

    return new Response(JSON.stringify({ ok: true, seeded: { nodes: nodes.length, edges: edges.length } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to rotate room' }), { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}


