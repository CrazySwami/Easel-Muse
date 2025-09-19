import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { env } from '@/lib/env';
import { projects } from '@/schema';
import { and, eq, isNull } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NewProjectButton } from './components/new-project-button';
import { ProjectList } from './components/project-list';

export const metadata: Metadata = {
  title: `Projects | ${env.NEXT_PUBLIC_APP_NAME}`,
  description: 'Manage your projects',
};

const ProjectsPage = async () => {
  const profile = await currentUserProfile();

  if (!profile) {
    redirect('/auth/login');
  }

  const userProjects = await database.query.projects.findMany({
    where: eq(projects.userId, profile.id),
    orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
  });

  return (
    <div className="container mx-auto py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Your Projects
          </h1>
          <p className="mt-2 text-muted-foreground">
            Here you can see and manage all of your projects.
          </p>
        </div>
        <NewProjectButton />
      </div>

      <div className="mt-8">
        <ProjectList projects={userProjects} />
      </div>
    </div>
  );
};

export default ProjectsPage;
