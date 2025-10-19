'use client';

// Lightweight, safe dev-only render diagnostics.
// - If optional deps aren't installed, this no-ops.
// - Uses dynamic import so bundling won't fail without the packages.
// - Runs only on the client in development.

import React from 'react';

if (process.env.NODE_ENV !== 'production') {
  if (typeof window !== 'undefined') {
    // why-did-you-render: helps spot unnecessary re-renders
    const WDYR = '@welldone-software/why-did-you-render';
    // use indirection to avoid type-resolution when package is not installed
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
              // Reduce noise from common primitives; adjust as needed
              exclude: [/^Tooltip/, /^ContextMenu/, /^Dialog/],
            });
          }
        } catch {}
      })
      .catch(() => {});

    // react-scan overlay: visualizes component render frequency/cost
    const RSCAN = 'react-scan/dist/auto';
    import(RSCAN as any).catch(() => {});
  }
}


