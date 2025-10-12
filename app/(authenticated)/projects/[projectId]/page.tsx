import { Canvas } from '@/components/canvas';
import { Reasoning } from '@/components/reasoning';
import { SaveIndicator } from '@/components/save-indicator';
import { Toolbar } from '@/components/toolbar';
import { TopBar } from '@/components/top-bar';
import { currentUserProfile, currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { ProjectProvider } from '@/providers/project';
import { CursorsLayer, LiveblocksRoomProvider, RoomDebugPanel } from '@/providers/liveblocks';
import LiveblocksClientProvider from '@/providers/liveblocks-provider';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import { env } from '@/lib/env';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: env.NEXT_PUBLIC_APP_NAME,
  description: 'Create and share AI workflows',
};

export const maxDuration = 300; // 5 minutes

type ProjectProps = {
  params: Promise<{
    projectId: string;
  }>;
  searchParams?: Promise<{ ro?: string }>;
};

const Project = async ({ params, searchParams }: ProjectProps) => {
  const { projectId } = await params;
  const { ro } = (await (searchParams ?? Promise.resolve({}))) as { ro?: string };
  const profile = await currentUserProfile();
  const user = await currentUser();

  if (!profile || !user) {
    return null;
  }


  if (!profile.onboardedAt) {
    return redirect('/welcome');
  }

  // Load the requested project directly (owner, member, or read-only via token)
  const currentProject = await database.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!currentProject) notFound();

  const isOwner = currentProject.userId === user.id;
  const isMember = Array.isArray(currentProject.members) && currentProject.members.includes(user.id);
  const isReadOnlyToken = Boolean(ro && ro === (currentProject.readOnlyToken as any));

  if (!isOwner && !isMember && !isReadOnlyToken) {
    notFound();
  }

  // For the project selector, still list the user's own projects
  const allProjects = await database.query.projects.findMany({ where: eq(projects.userId, user.id) });


  return (
    <div className="flex h-screen w-screen items-stretch overflow-hidden">
      <div className="relative flex-1" style={{ overscrollBehaviorX: 'none' }}>
        <LiveblocksClientProvider>
            <LiveblocksRoomProvider projectId={projectId}>
              <ProjectProvider data={currentProject}>
                <Canvas debug={profile.debug}>
                  <Toolbar />
                  <CursorsLayer />
                </Canvas>
              {/* Debug panel toggled per profile.debug */}
              {profile.debug ? <RoomDebugPanel projectId={projectId} /> : null}
            </ProjectProvider>
            <Suspense fallback={null}>
              <TopBar projects={allProjects} currentProject={currentProject} profile={profile} />
            </Suspense>
          </LiveblocksRoomProvider>
        </LiveblocksClientProvider>
      </div>
      <Reasoning />
    </div>
  );
};

export default Project;
