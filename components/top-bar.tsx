'use client';

import { cn } from '@/lib/utils';
import { type projects, type profile } from '@/schema';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { AvatarStack, RoomStatus } from '@/providers/liveblocks';
import { Button } from './ui/button';
import { ProjectSelector } from './project-selector';
import { CreditCounter } from './credits-counter';
import { Menu } from './menu';
import { ShareDialog } from './share-dialog';
import { SaveIndicator } from './save-indicator';

interface TopBarProps {
  projects: (typeof projects.$inferSelect)[];
  currentProject: typeof projects.$inferSelect;
  profile: typeof profile.$inferSelect | null;
}

export const TopBar = ({ projects, currentProject, profile }: TopBarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!profile) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-50 p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Image src="/Easel-Logo.svg" alt="Easel Logo" width={24} height={24} />
          </Button>
          <div
            className={cn(
              'flex items-center gap-2 transition-all duration-300',
              isCollapsed ? 'opacity-0 max-w-0' : 'opacity-100 max-w-lg'
            )}
          >
            <ProjectSelector projects={projects} currentProject={currentProject.id} />
          </div>
        </div>

        {/* Right side */}
        <div
          className={cn(
            'flex items-center gap-2 transition-all duration-300',
            isCollapsed ? 'opacity-0' : 'opacity-100'
          )}
        >
          {profile.subscriptionId ? (
            <div className="flex items-center rounded-full border bg-card/90 px-3 py-2 drop-shadow-xs backdrop-blur-sm">
              <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
                <CreditCounter />
              </Suspense>
            </div>
          ) : (
            <div className="flex items-center rounded-full border bg-card/90 p-0.5 drop-shadow-xs backdrop-blur-sm">
              <Button className="rounded-full" size="lg" asChild>
                <Link href="/pricing">Claim your free AI credits</Link>
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
            <RoomStatus />
            <AvatarStack />
          </div>
          <ShareDialog projectId={currentProject.id} />
          <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
            <Menu />
          </div>
          <SaveIndicator />
        </div>
      </div>
    </div>
  );
};
