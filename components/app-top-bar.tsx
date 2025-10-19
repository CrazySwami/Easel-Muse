'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Button } from './ui/button';
import { CreditCounter } from './credits-counter';
import { Menu } from './menu';
import { type profile } from '@/schema';

interface AppTopBarProps {
  profile: typeof profile.$inferSelect | null;
}

export const AppTopBar = ({ profile }: AppTopBarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!profile) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded-full h-10 w-10 shrink-0"
          >
            <Image src="/Easel-Logo.svg" alt="Easel Logo" width={24} height={24} />
          </Button>
          <div className={"flex items-center gap-2"}></div>
        </div>
        <div className={"flex items-center gap-2"}>
          <div className="flex h-10 items-center gap-2 rounded-full border bg-card/90 px-3 drop-shadow-xs backdrop-blur-sm">
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
          </div>
          <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
            <Menu />
          </div>
        </div>
      </div>
    </div>
  );
};


