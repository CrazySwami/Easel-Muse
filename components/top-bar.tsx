'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronsRightLeft } from 'lucide-react';
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
import { ControlsMenu } from './controls';

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
            variant="secondary"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full h-9 w-9 shrink-0 bg-green-500/20 hover:bg-green-500/30 border-green-500/30"
          >
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }}>
              <ChevronsRightLeft className="h-4 w-4 text-green-500" />
            </motion.div>
          </Button>
          <Link href="/projects" className="flex items-center justify-center h-10 w-10 shrink-0">
            <Image src="/Easel-Logo.svg" alt="Easel Logo" width={24} height={24} />
          </Link>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex items-center gap-2 overflow-hidden"
              >
                <ProjectSelector projects={projects} currentProject={currentProject.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                layout
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                exit={{ opacity: 0, scaleX: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                className="flex origin-right h-10 items-center gap-2 rounded-full border bg-card/90 px-3 drop-shadow-xs backdrop-blur-sm"
              >
                {profile.subscriptionId ? (
                  <Suspense fallback={<p className="text-muted-foreground text-sm">Loading...</p>}>
                    <div className="pl-1">
                      <CreditCounter showLabel />
                    </div>
                  </Suspense>
                ) : (
                  <Button className="rounded-full" size="sm" asChild>
                    <Link href="/pricing">Claim free credits</Link>
                  </Button>
                )}
                <span className="mx-1 h-5 w-px bg-border" />
                <RoomStatus inline />
                <div className="hidden md:flex">
                  <AvatarStack />
                </div>
                <span className="mx-1 h-5 w-px bg-border" />
                <ShareDialog projectId={currentProject.id} />
                <span className="mx-1 h-5 w-px bg-border" />
                <ControlsMenu />
              </motion.div>
            )}
          </AnimatePresence>
          <SaveIndicator />
          <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
            <Menu />
          </div>
        </div>
      </div>
    </div>
  );
};
