'use client';

// Lightweight, safe dev-only render diagnostics.
// - If optional deps aren't installed, this no-ops.
// - Uses dynamic import so bundling won't fail without the packages.
// - Runs only on the client in development.

import React from 'react';

if (process.env.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') {
    const enabled = String(process.env.NEXT_PUBLIC_ENABLE_RENDER_DIAGS || '').toLowerCase() === '1';
    if (enabled) {
      const WDYR = '@welldone-software/why-did-you-render';
      import(WDYR as any)
        .then((mod: any) => {
          try {
            const wdyr = (mod && (mod.default || mod)) as (r: typeof React, opts?: any) => void;
            if (wdyr) {
              (React as any).whyDidYouRender = true;
              wdyr(React, {
                trackAllPureComponents: true,
                trackHooks: true,
                collapseGroups: true,
                exclude: [/^Tooltip/, /^ContextMenu/, /^Dialog/, /^NodeResizer/, /^ReactFlow/],
              });
            }
          } catch {}
        })
        .catch(() => {});

      // Load react-scan install hook first, then overlay
      import('react-scan/dist/install-hook.global.js' as any)
        .then(() => import('react-scan/dist/auto.global.js' as any))
        .then(() => { try { console.info('[diags] React Scan overlay enabled'); } catch {} })
        .catch(() => {});
    }
  }
}


