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
      try { console.info('[diags] Enabling dev instrumentation…'); } catch {}
      // Lightweight console capture so sessions can be copied
      try {
        const g = window as any;
        const MAX = 2000;
        const buf: string[] = (g.__diagsLogs ??= []);
        const orig = {
          log: console.log.bind(console),
          warn: console.warn.bind(console),
          error: console.error.bind(console),
          info: console.info.bind(console),
        } as const;
        const toLine = (level: string, args: any[]) => {
          const ts = new Date().toISOString();
          const parts = args.map((a) => {
            try {
              if (typeof a === 'string') return a;
              return JSON.stringify(a);
            } catch {
              try { return String(a); } catch { return '[unserializable]'; }
            }
          });
          return `[${ts}] ${level.toUpperCase()}: ${parts.join(' ')}`;
        };
        const wrap = (level: keyof typeof orig) =>
          (...args: any[]) => {
            try {
              const line = toLine(level, args);
              buf.push(line);
              if (buf.length > MAX) buf.splice(0, buf.length - MAX);
            } catch {}
            return (orig as any)[level](...args);
          };
        console.log = wrap('log') as any;
        console.warn = wrap('warn') as any;
        console.error = wrap('error') as any;
        console.info = wrap('info') as any;
        g.getDiags = () => [...buf];
        g.clearDiags = () => { buf.length = 0; };
        g.copyDiags = async () => {
          try {
            await navigator.clipboard.writeText(buf.join('\n'));
            orig.info('[diags] Copied diagnostics to clipboard');
          } catch (e) {
            orig.warn('[diags] Failed to copy diagnostics:', e);
          }
        };
        orig.info('[diags] Console capture enabled (window.copyDiags)');
      } catch {}
      const WDYR = '@welldone-software/why-did-you-render';
      import(WDYR as any)
        .then((mod: any) => {
          try {
            const wdyr = (mod && (mod.default || mod)) as (r: typeof React, opts?: any) => void;
            if (wdyr) {
              (React as any).whyDidYouRender = true;
              wdyr(React, {
                trackAllPureComponents: true,
                // Disable hook tracking to avoid hooks-order issues with HMR
                trackHooks: false,
                collapseGroups: true,
                exclude: [/^Tooltip/, /^ContextMenu/, /^Dialog/, /^NodeResizer/, /^ReactFlow/],
              });
              try { console.info('[diags] why-did-you-render enabled'); } catch {}
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


