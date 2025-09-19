export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Liveblocks } from '@liveblocks/node';
import { createClient as createSupabase } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const { room } = (await req.json().catch(() => ({}))) as { room?: string };
    const url = new URL(req.url);
    const qp = url.searchParams.get('room');
    const ro = url.searchParams.get('ro');
    const roomId = room || qp;
    if (!roomId) return new Response(JSON.stringify({ error: 'Missing room id' }), { status: 400 });

    const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

    // Identify the user via Supabase (server)
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    let permission: any = 'read';
    let userId = 'anon';
    let userInfo: Record<string, unknown> | undefined;

    if (user) {
      userId = user.id;
      const meta: Record<string, unknown> = (user as any).user_metadata ?? {};
      const preferredName = (meta.full_name as string | undefined) || (meta.name as string | undefined) || (user.email ? user.email.split('@')[0] : undefined) || 'Anonymous';
      const avatarUrl = (meta.avatar as string | undefined) || (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || undefined;
      userInfo = { name: preferredName, email: user.email ?? undefined, avatar: avatarUrl };

      try {
        const project = await database.query.projects.findFirst({ where: eq(projects.id, roomId) });
        if (project) {
          const isOwner = project.userId === user.id;
          const members = Array.isArray(project.members) ? project.members : [];
          const isMember = members.includes(user.id);
          // Read-only token grants presence-only
          if (ro && ro === project.readOnlyToken) {
            permission = 'read';
          } else if (isOwner || isMember) {
            permission = 'write';
          } else {
            permission = 'read';
          }
        }
      } catch {
        // If the DB check fails, fall back to read access
        permission = 'read';
      }
    } else {
      // Unauthenticated users: allow presence-only (read) unless a read-only token is explicitly provided and matches project
      permission = 'read';
    }

    const session = lb.prepareSession(userId, { userInfo });
    session.allow(roomId, permission === 'write' ? session.FULL_ACCESS : session.READ_ACCESS);
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (err: any) {
    console.error('Liveblocks auth POST error:', err?.message, err?.response?.data);
    return new Response(JSON.stringify({ error: err?.message || 'Authorization failed' }), { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qp = url.searchParams.get('room');
    const ro = url.searchParams.get('ro');
    if (!qp) return new Response(JSON.stringify({ error: 'Missing room id' }), { status: 400 });

    const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });
    const supabase = await createSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    let permission: any = 'read';
    let userId = 'anon';
    let userInfo: Record<string, unknown> | undefined;

    if (user) {
      userId = user.id;
      const meta: Record<string, unknown> = (user as any).user_metadata ?? {};
      const preferredName = (meta.full_name as string | undefined) || (meta.name as string | undefined) || (user.email ? user.email.split('@')[0] : undefined) || 'Anonymous';
      const avatarUrl = (meta.avatar as string | undefined) || (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || undefined;
      userInfo = { name: preferredName, email: user.email ?? undefined, avatar: avatarUrl };

      try {
        const project = await database.query.projects.findFirst({ where: eq(projects.id, qp) });
        if (project) {
          const isOwner = project.userId === user.id;
          const members = Array.isArray(project.members) ? project.members : [];
          const isMember = members.includes(user.id);
          if (ro && ro === project.readOnlyToken) {
            permission = 'read';
          } else if (isOwner || isMember) {
            permission = 'write';
          } else {
            permission = 'read';
          }
        }
      } catch {
        permission = 'read';
      }
    }

    const session = lb.prepareSession(userId, { userInfo });
    session.allow(qp, permission === 'write' ? session.FULL_ACCESS : session.READ_ACCESS);
    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (err: any) {
    console.error('Liveblocks auth GET error:', err?.message, err?.response?.data);
    return new Response(JSON.stringify({ error: err?.message || 'Authorization failed' }), { status: 500 });
  }
}


