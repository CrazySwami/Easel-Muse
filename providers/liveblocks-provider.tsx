'use client';

import { LiveblocksProvider } from '@liveblocks/react';
import type { PropsWithChildren } from 'react';

export default function LiveblocksClientProvider({ children }: PropsWithChildren) {
  // Prefer server-auth so we can attach Supabase user info (name/avatar)
  // and enforce room permissions. Even if a public key is present, we
  // intentionally route through the auth endpoint.
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks/auth">
      {children}
    </LiveblocksProvider>
  );
}
