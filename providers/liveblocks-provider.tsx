'use client';

import { LiveblocksProvider } from '@liveblocks/react';
import type { PropsWithChildren } from 'react';

export const LiveblocksClientProvider = ({ children }: PropsWithChildren) => {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {children}
    </LiveblocksProvider>
  );
};
