'use server';

import { createClient } from '@/lib/supabase/server';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { projects } from '@/schema';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function generateShareLinks(projectId: string): Promise<
  | { readOnlyUrl: string; inviteUrl: string }
  | { error: string }
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const readOnlyToken = nanoid();
    const inviteToken = nanoid();

    await database
      .update(projects)
      .set({ readOnlyToken, inviteToken })
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    return {
      readOnlyUrl: `${base}/projects/${projectId}?ro=${readOnlyToken}`,
      inviteUrl: `${base}/api/accept-invite?projectId=${projectId}&invite=${inviteToken}`,
    };
  } catch (error) {
    return { error: parseError(error) };
  }
}


