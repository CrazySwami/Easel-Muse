### Canvas & Nodes Performance Checklist

Goal: Ship and maintain a smooth canvas (target 55–60 FPS during common interactions) and stable memory usage, with reproducible profiling and stress testing.

How to use: Work top-to-bottom. For each item, record status and notes under Results.

---

## 1) Canvas plumbing

- [ ] Stable graph props: Ensure `nodes`/`edges` references are preserved unless a field truly changes (no blind map+spread per render).
- [ ] Shallow store reads: Use Zustand shallow selectors when reading graph state.
- [ ] Batched handlers: Keep `onNodesChange`/`onEdgesChange` batched and equality-guarded before setter calls.
- [ ] Save/persistence: Debounced, idempotent saves; skip if payload is identical to last serialized content.

Results:
- 2025-10-19 — Shallow selectors for graph state (nodes/edges) to reduce unrelated re-renders.
  - Commit: 2d840b2
  - Expected outcome: fewer React Flow updates when unrelated store keys change; steadier FPS during idle, pan, and simple selections.
  - How to verify:
    1) Open canvas and React Scan. Move selection between nodes; overlays should show limited rerenders.
    2) With React DevTools Profiler, record a select→deselect; expect lower commit count vs before.

- 2025-10-19 — Skip identical save payloads (idempotent saves) to avoid unnecessary work.
  - Commit: 2d840b2
  - Expected outcome: fewer network calls and no save-induced reflows when the graph hasn’t changed; reduced lockups during rapid interactions.
  - How to verify:
    1) Perform small interactions that don’t change graph structure; watch Network tab — no redundant save requests.
    2) Toggle a selection repeatedly; confirm no saves fire until actual graph changes occur.

- 2025-10-19 — Preserve node object references when `draggable` is unchanged (cuts projection churn).
  - Commit: b72beec
  - Expected outcome: React Flow avoids re-laying out unchanged nodes; smoother drag/zoom on large graphs.
  - How to verify:
    1) With React Scan enabled, pan/zoom — expect fewer node highlights on non-changing frames.
    2) Profiler: drag a node for ~1s; expect fewer commits from node lists.

---

## 2) Node authorship rules

- [ ] React.memo: Wrap all node primitives/transforms with `React.memo`.
- [ ] Shallow props: Avoid new inline objects/functions; use `useMemo`/`useCallback`.
- [ ] No effect loops: Effects that write to state/data must guard strict equality and use minimal deps.
- [ ] Safe updates: Replace `updateNodeData` with `updateNodeDataIfChanged` everywhere.
- [ ] Heavy UI gates: Render heavy subtrees (markdown/editor/previews) only when node is visible and/or selected; lazy‑load big deps.

Results:
- Nodes updated:
- Issues found:

---

## 3) Expensive work deferral

- [ ] Defer non‑visual work via `requestIdleCallback` (or `setTimeout(16)` fallback).
- [ ] Throttle/raf‑wrap drag/scroll analytics and DOM measurements.

Results:
- Notes:

---

## 4) Edge/connection rules

- [ ] Memoized validation: Keep `isValidConnection` stable; avoid full graph scans on hover.
- [ ] Cycle/path checks: Compute only when required inputs changed.

Results:
- Notes:

---

## 5) Canvas configuration

- [ ] Static node/edge registries: Ensure `nodeTypes`/`edgeTypes` are module-scope constants.
- [ ] Zoom bounds: Keep `minZoom`/`maxZoom` reasonable for DOM/interaction complexity.
- [ ] Feature toggles: Confirm optional visuals can be disabled during stress.

Results:
- Notes:

---

## 6) Diagnostics & profiling (dev-only)

- [ ] React Scan overlays: Confirm enabled via env toggle; verify only interacted nodes rerender.
- [ ] React DevTools Profiler: Record select+drag; identify top offenders by commit duration.
- [ ] Chrome Performance: 10s capture for pan/zoom/drag; check FPS and main-thread blocks.
- [ ] Log capture: Use `window.copyDiags()` / `downloadDiags()` to export logs after a hitch.

Results:
- Logs/Profiles:

---

## 7) Stress tests (manual for now)

Static scale:
- [ ] Spawn 50/100/500 nodes (no heavy UIs), measure idle FPS/pan/zoom.

Interaction scale:
- [ ] Programmatic drag of 10 nodes (1s), capture FPS.

Node type stress:
- [ ] 20 copies of each heavy node type; run core interaction; check rerender counts and FPS.

Results:
- Notes:

---

## 8) Documentation updates

- [ ] Add “Node performance rules” to `docs/ui-and-component-guide.md` with examples.
- [ ] Expand `docs/memory-optimizations.md` with profiling playbook and churn budgets.
- [ ] Link to this checklist from both docs.

Results:
- PR/Links:

---

## 9) Gatekeepers before merge (per PR)

- [ ] Node changes follow memo/gates/lazy-load rules.
- [ ] No effect loops; equality guards present.
- [ ] updateNodeDataIfChanged used.
- [ ] Local stress run done; attach brief results.

Results:
- Checklist outcome:


