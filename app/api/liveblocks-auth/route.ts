import { createClient } from '@/lib/supabase/server';
import { Liveblocks } from '@liveblocks/node';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { room } = (await request.json()) as { room?: string };
    const url = new URL(request.url);
    const ro = url.searchParams.get('ro');

    console.log('Liveblocks auth request:', { room, ro });

    if (!room) {
      return new Response('Missing room', { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    console.log('User auth:', { userId: user?.id, email: user?.email });

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Authorize against the project membership
    const project = await database.query.projects.findFirst({
      where: eq(projects.id, room),
    });

    if (!project) {
      return new Response('Project not found', { status: 404 });
    }

    const members = project.members ?? [];
    const isOwner = project.userId === user.id;
    const isMember = Array.isArray(members) && members.includes(user.id);

    console.log('Project access check:', {
      projectId: project.id,
      userId: user.id,
      isOwner,
      isMember,
      members,
      ro,
      readOnlyToken: project.readOnlyToken
    });

    if (ro) {
      if (ro !== project.readOnlyToken) {
        console.log('Read-only token mismatch');
        return new Response('Forbidden', { status: 403 });
      }
      // Read-only: allow presence but client should not mutate
      console.log('Read-only access granted');
    } else if (!isOwner && !isMember) {
      console.log('Access denied - not owner or member');
      return new Response('Forbidden', { status: 403 });
    } else {
      console.log('Full access granted');
    }

    const liveblocks = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

    const colors = [
      '#ef4444',
      '#f59e0b',
      '#84cc16',
      '#22c55e',
      '#06b6d4',
      '#3b82f6',
      '#6366f1',
      '#a855f7',
      '#ec4899',
      '#f97316',
    ];
    const hash = Array.from(user.id).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const color = colors[hash % colors.length];

    const meta: Record<string, unknown> = (user as any).user_metadata ?? {};
    const preferredName =
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      (user.email ? user.email.split('@')[0] : undefined) ||
      'Anonymous';
    const avatarUrl =
      // Custom avatar uploaded via profile overrides provider defaults
      (meta.avatar as string | undefined) ||
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      undefined;

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: preferredName,
        email: user.email ?? undefined,
        avatar: avatarUrl,
        color,
      },
    });

    session.allow(room, session.FULL_ACCESS);

    const { status, body } = await session.authorize();
    return new Response(body, { status });
  } catch (error) {
    return new Response('Authorization error', { status: 500 });
  }
}

export function GET() {
  return new Response('Method Not Allowed', { status: 405 });
}

