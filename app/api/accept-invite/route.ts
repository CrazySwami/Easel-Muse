import { createClient } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const invite = url.searchParams.get('invite');

    if (!projectId || !invite) {
      return new Response('Missing params', { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || project.inviteToken !== invite) {
      return new Response('Invalid invite', { status: 403 });
    }

    const members = new Set<string>(project.members ?? []);
    members.add(user.id);

    await database
      .update(projects)
      .set({ members: Array.from(members) })
      .where(eq(projects.id, projectId));

    return Response.redirect(`${url.origin}/projects/${projectId}`, 302);
  } catch {
    return new Response('Error accepting invite', { status: 500 });
  }
}


