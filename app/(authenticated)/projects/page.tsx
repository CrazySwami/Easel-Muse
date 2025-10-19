import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PageHeader } from '@/components/page-header';

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
    <div>
      <PageHeader title="Your Projects" description="Here you can see and manage all of your projects." rightSlot={<NewProjectButton />} />
      <div className="container mx-auto px-4 mt-8">
        <ProjectList projects={userProjects} currentUserId={profile.id} />
      </div>
    </div>
  );
};

export default ProjectsPage;
