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
        let wrapped = false;
        let suppressed = 0;
        let sampleMode = false;
        let eventsThisTick = 0;
        const SAMPLE_THRESHOLD = 500; // logs/sec
        const tick = () => {
          if (eventsThisTick > SAMPLE_THRESHOLD) {
            sampleMode = true;
          } else if (sampleMode && eventsThisTick < SAMPLE_THRESHOLD / 2) {
            sampleMode = false;
          }
          eventsThisTick = 0;
        };
        const ticker = setInterval(tick, 1000);
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
            eventsThisTick++;
            try {
              if (sampleMode) {
                suppressed++;
              } else {
                const line = toLine(level, args);
                buf.push(line);
                if (buf.length > MAX) buf.splice(0, buf.length - MAX);
              }
            } catch {}
            return (orig as any)[level](...args);
          };
        const applyWrap = () => {
          if (wrapped) return;
          console.log = wrap('log') as any;
          console.warn = wrap('warn') as any;
          console.error = wrap('error') as any;
          console.info = wrap('info') as any;
          wrapped = true;
        };
        const removeWrap = () => {
          if (!wrapped) return;
          console.log = orig.log as any;
          console.warn = orig.warn as any;
          console.error = orig.error as any;
          console.info = orig.info as any;
          wrapped = false;
        };
        applyWrap();
        // Emit periodic summary while sampling
        const sampler = setInterval(() => {
          if (!sampleMode || suppressed === 0) return;
          const line = `[${new Date().toISOString()}] INFO: [diags] sampling active, suppressed ${suppressed} logs in the last interval`;
          buf.push(line);
          if (buf.length > MAX) buf.splice(0, buf.length - MAX);
          suppressed = 0;
        }, 1500);
        g.getDiags = () => [...buf];
        g.clearDiags = () => { buf.length = 0; };
        g.copyDiags = async () => {
          try {
            if (!document.hasFocus()) throw new Error('document-not-focused');
            await navigator.clipboard.writeText(buf.join('\n'));
            orig.info('[diags] Copied diagnostics to clipboard');
          } catch (e) {
            try {
              // Fallback: download if clipboard blocked/unfocused
              const why = (e as any)?.message || e;
              orig.warn('[diags] Clipboard unavailable, downloading instead:', why);
              const blob = new Blob([buf.join('\n')], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `diags-${Date.now()}.txt`; a.click();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            } catch (err2) {
              orig.warn('[diags] Failed to download diagnostics:', err2);
            }
          }
        };
        g.pauseDiags = () => { removeWrap(); orig.info('[diags] capture paused'); };
        g.resumeDiags = () => { applyWrap(); orig.info('[diags] capture resumed'); };
        g.downloadDiags = () => {
          try {
            const blob = new Blob([buf.join('\n')], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `diags-${Date.now()}.txt`; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 5000);
          } catch (e) { orig.warn('[diags] Failed to download diagnostics:', e); }
        };
        // Hotkeys: Cmd/Ctrl+Shift+C copy, +D toggle, +L download
        const onKey = (e: KeyboardEvent) => {
          const mod = e.metaKey || e.ctrlKey;
          if (!mod || !e.shiftKey) return;
          if (e.code === 'KeyC') { e.preventDefault(); g.copyDiags(); }
          if (e.code === 'KeyD') { e.preventDefault(); wrapped ? g.pauseDiags() : g.resumeDiags(); }
          if (e.code === 'KeyL') { e.preventDefault(); g.downloadDiags(); }
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('beforeunload', () => { try { g.copyDiags(); } catch {} });
        g.__diagsCleanup = () => { clearInterval(tick as any); clearInterval(sampler as any); window.removeEventListener('keydown', onKey); };
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


