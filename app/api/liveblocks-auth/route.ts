import { currentUser } from '@/lib/auth';
import { env } from '@/lib/env';
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

    if (!room) {
      return new Response('Missing room', { status: 400 });
    }

    const user = await currentUser();

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

    if (ro) {
      if (ro !== project.readOnlyToken) {
        return new Response('Forbidden', { status: 403 });
      }
      // Read-only: allow presence but client should not mutate
    } else if (!isOwner && !isMember) {
      return new Response('Forbidden', { status: 403 });
    }

    const liveblocks = new Liveblocks({ secret: env.LIVEBLOCKS_SECRET_KEY });

    const session = liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.email ?? 'Anonymous',
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

