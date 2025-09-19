# Liveblocks + React Flow integration (XYFlow)

This doc summarizes how our collaborative canvas maps to the Liveblocks + React Flow example you cited, adapted to `@xyflow/react` and our app needs.

## What we mirror from the example
- **Controlled graph state**: We keep nodes/edges controlled and centralized, mirroring `useNodesState`/`useEdgesState` patterns. See `components/canvas.tsx` where `nodes`/`edges` come from a single store (`useFlowStore`) and we apply `applyNodeChanges`/`applyEdgeChanges`.
- **React Flow controlled events**: We wire `onNodesChange`, `onEdgesChange`, `onConnect`, and validation via `isValidConnection` with `addEdge`/`getOutgoers`, matching the example’s approach to keep business rules at the edge of the flow.
- **Room lifecycle**: We join the Liveblocks room via `RoomProvider` and use presence (`useOthers`, `useSelf`) in `providers/liveblocks.tsx`, same conceptual flow as the example’s `enterRoom/leaveRoom`.
- **Presence cursors**: We publish cursor presence and render peers’ cursors top‑level, converting screen coordinates to flow coordinates with `useReactFlow().screenToFlowPosition` to keep cursors consistent under pan/zoom.

## Our additions (beyond the example)
- **Yjs-only data model (now default)**: We integrate `@liveblocks/yjs` for CRDT syncing of the graph with explicit Y.Maps/Y.Arrays for `nodesMap`/`nodesOrder` and `edgesMap`/`edgesOrder`. This lets us:
  - Avoid large shared array diffs; we maintain stable order arrays and keyed maps for O(1) updates.
  - Batch writes inside `Y.transact(…, 'local')` to minimize update storms.
  - Gate writes: presence-only drags update local UI without CRDT writes until drag end.
- **Local-only fallback removed**: We always run with Yjs enabled to ensure a single source of truth and parity with the example’s stability.
- **Drop‑to‑create shortcut**: Using `onConnectStart`/`onConnectEnd`, dropping a partial connection onto the pane spawns a `drop` node and wires a temporary edge, enabling keyboard‑free authoring.
- **Lock hints**: A minimal lock provider (`providers/locks`) currently marks nodes as locally “locked” during drag to prevent conflicting updates. This is a stub for future Yjs-backed locks.
- **Persistence**: We debounce `toObject()` and persist the flow as project content in the DB via `updateProjectAction`.

## Key files
- `providers/liveblocks.tsx`
  - `LiveblocksRoomProvider`: wraps pages with `RoomProvider`
  - `CursorsLayer`, `RoomAvatars`, `RoomStatus`, `RoomDebugPanel`: presence and room diagnostics
- `components/canvas.tsx`
  - React Flow instance with controlled `nodes`/`edges`, event handlers, Yjs option, drop‑to‑create, shortcuts
- `lib/xyflow.ts`
  - `isValidSourceTarget` and selectors for extracting data across node types

## Required patterns we follow
- React Flow is treated as controlled; all mutations funnel through our handlers and store.
- Presence is light‑weight and decoupled from CRDT writes; we throttle cursor updates and render locally each frame.
- Pan/zoom correctness: we transform presence coordinates using React Flow’s viewport transform to ensure pixel‑perfect cursor placement.
- Serialization: we rely on `reactFlowInstance.toObject()` for persistence and rehydration.

## How to extend safely
- New node types: register in `components/nodes/index.tsx` and ensure `isValidSourceTarget` is updated for connection rules.
- Real locks: replace the in‑memory locks with a Yjs map keyed by node id, and publish lock presence for UX hints.
- Sidebar DnD palette: follow MDN Drag & Drop for the sidebar and use React Flow’s `onDrop` + `screenToFlowPosition` to place nodes precisely.
- ReactFlowProvider: keep all graph UI inside a single provider scope; use `useReactFlow()` for imperative operations (fitView, toObject, updateNode).

## Minimal code references
```tsx
// providers/liveblocks.tsx
export const LiveblocksRoomProvider = ({ children, projectId }) => (
  <RoomProvider id={projectId} initialPresence={{ cursor: null }}>
    <ClientSideSuspense fallback={<div>Loading room...</div>}>{children}</ClientSideSuspense>
  </RoomProvider>
);
```

```tsx
// components/canvas.tsx (extract)
<ReactFlow
  nodes={nodes}
  onNodesChange={handleNodesChange}
  edges={edges}
  onEdgesChange={handleEdgesChange}
  onConnectStart={handleConnectStart}
  onConnect={handleConnect}
  onConnectEnd={handleConnectEnd}
  isValidConnection={isValidConnection}
  fitView
/>
```

```ts
// lib/xyflow.ts
export const isValidSourceTarget = (source: Node, target: Node) => {
  if (source.type === 'video' || source.type === 'drop') return false;
  if (target.type === 'audio' && source.type !== 'text') return false;
  if (target.type === 'file') return false;
  return true;
};
```

## Notes
- We use `@xyflow/react` (React Flow v12+) which is a maintained fork; APIs shown above align with the official example semantics.
- Presence rendering is fixed‑position overlay to avoid layout reflow on the canvas while still aligning under viewport transforms.
- Yjs is the single source of truth; DB saves are debounced and never happen during drag/connect to avoid overwrite races.

