'use server';

import { currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { projects } from '@/schema';
import { and, eq } from 'drizzle-orm';

export const deleteProjectAction = async (
  projectId: string
): Promise<
  | {
      success: true;
    }
  | {
      error: string;
    }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error('You need to be logged in to delete a project!');
    }

    const project = await database
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

    if (!project) {
      throw new Error('Project not found');
    }

    return { success: true };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};

export const deleteProjectsBulkAction = async (
  projectIds: string[],
): Promise<
  | { success: true; count: number }
  | { error: string }
> => {
  try {
    const user = await currentUser();
    if (!user) throw new Error('You need to be logged in to delete projects!');
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return { success: true, count: 0 };
    }

    const { inArray } = await import('drizzle-orm');
    const result = await database
      .delete(projects)
      .where(and(inArray(projects.id, projectIds), eq(projects.userId, user.id)));

    // Drizzle returns info via driver; we can just report the requested count
    return { success: true, count: projectIds.length };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};
