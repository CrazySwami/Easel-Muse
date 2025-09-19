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
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { NewProjectButton } from './components/new-project-button';
import { ProjectList } from './components/project-list';
import { Menu } from '@/components/menu';
import { ThemeSwitcher } from '@/components/theme-switcher';

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
      <div className="container mx-auto py-12 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/Easel-Logo.svg"
              alt="Easel"
              width={40}
              height={40}
              priority
            />
            <div>
              <h1 className="font-serif text-4xl font-semibold tracking-tight">
                Your Projects
              </h1>
              <p className="mt-2 text-muted-foreground">
                Here you can see and manage all of your projects.
              </p>
            </div>
          </div>
        <div className="flex items-center gap-4">
          <NewProjectButton />
          <Menu />
          <ThemeSwitcher />
        </div>
      </div>

      <div className="mt-8">
        <ProjectList projects={userProjects} />
      </div>
    </div>
  );
};

export default ProjectsPage;
