'use client';

import { LiveblocksProvider } from '@liveblocks/react';
import type { PropsWithChildren } from 'react';

export default function LiveblocksClientProvider({ children }: PropsWithChildren) {
  const publicApiKey = (process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY as string) || '';
  if (publicApiKey) {
    return <LiveblocksProvider publicApiKey={publicApiKey}>{children}</LiveblocksProvider>;
  }
  return <LiveblocksProvider authEndpoint="/api/liveblocks/auth">{children}</LiveblocksProvider>;
}
