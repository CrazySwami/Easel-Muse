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
import { PlusIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
    where: and(eq(projects.ownerId, profile.id), isNull(projects.archivedAt)),
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
        <Button asChild>
          <Link href={`/projects/${crypto.randomUUID()}`}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Project
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userProjects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle>{project.name}</CardTitle>
              <CardDescription>
                Last updated: {new Date(project.updatedAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="secondary" className="w-full">
                <Link href={`/projects/${project.id}`}>Open</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProjectsPage;
