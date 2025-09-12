'use client';

import { LiveblocksProvider } from '@liveblocks/react';
import type { PropsWithChildren } from 'react';

export const LiveblocksClientProvider = ({ children }: PropsWithChildren) => {
  return (
    <LiveblocksProvider
      authEndpoint="/api/liveblocks-auth"
      {...({ throttle: 32, largeMessageStrategy: 'experimental-fallback-to-http' } as any)}
    >
      {children}
    </LiveblocksProvider>
  );
};
