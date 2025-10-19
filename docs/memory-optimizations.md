### Canvas Memory & Render Optimization (WIP)

Goals:
- Reduce unnecessary re-renders and memory churn in node components.
- Provide profiling steps and checklists for contributors.

Scope:
- React Flow graph lifecycle (nodes/edges handlers, selection, duplication).
- Node component patterns (editor/renderers, large arrays, memoization).
- Dev profiling toolchain and logging.

Profiling toolkit (dev only):
- React DevTools Profiler: record interactions to identify hot components.
- why-did-you-render: logs render causes and diffs when props/state change.
- react-scan overlay: visualizes component render frequency/cost.

Installation:
```bash
pnpm add -D @welldone-software/why-did-you-render react-scan
```

Enable diagnostics (env toggle):
```bash
# Start Next dev with diagnostics enabled
pnpm dev:diags

# Or manually
NEXT_PUBLIC_ENABLE_RENDER_DIAGS=1 pnpm dev
```

Notes:
- Instrumentation is dev-only and gated by `NEXT_PUBLIC_ENABLE_RENDER_DIAGS=1`.
- It’s imported via `components/canvas.tsx` → `lib/dev-instrumentation.ts` and no-ops in prod.
- See also: `docs/performance-checklist.md` for a step-by-step optimization plan and result logging.

Enable/disable:
- Instrumentation is loaded from `lib/dev-instrumentation.ts` which runs in development.
- Optionally gate with `NEXT_PUBLIC_ENABLE_RENDER_DIAGS=1` (planned).

Checklists:
- Prefer event handlers over effects; avoid writing graph state in `useEffect` without guards.
- Memoize large derived props/arrays; avoid recreating objects/functions every render.
- Use functional updates and shallow-equality guards to skip no-op state writes.
- Keep node defaults consistent between `lib/node-buttons.ts` and component fallbacks.

Next steps:
- Add env toggle for diagnostics; exclude noisy internals from logs.
- Instrument store setters to count/trace bursts (behind a debug flag).
- Document common offenders and fixes as we discover them.

