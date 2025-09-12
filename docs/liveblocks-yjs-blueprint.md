# Liveblocks + Yjs Blueprint for React Flow (10 collaborators)

This document specifies how we will (re)introduce Yjs with Liveblocks for collaborative editing on the React Flow canvas, optimized for memory and network use.

## Goals
- Presence (cursors/avatars) stays smooth for up to 10 users
- Shared graph edits without duplicate keys or oversized websocket payloads
- Avoid syncing heavy payloads (images, transcripts, long prompts) through Yjs
- Observability: simple client/server metrics + reset tools

## Room & Auth
- `roomId = projectId`
- Server route `app/api/liveblocks-auth/route.ts` issues ID tokens
  - Owner/members: FULL_ACCESS
  - Read‑only: `room:read + room:presence:write`

## Data model (Yjs)
- Y.Doc keys
  - `nodesMap: Y.Map<NodeLite>`
  - `nodesOrder: Y.Array<string>`
  - `edgesMap: Y.Map<EdgeLite>`
  - `edgesOrder: Y.Array<string>`
- NodeLite fields (only structure): `{ id, type, position, data?: { label?: string, refs?: { assetId?: string } } }`
- EdgeLite fields: `{ id, source, target, type }`
- Heavy fields (images, transcripts, long prompts) live in Supabase; nodes store refs/URLs only.

## Update patterns
- rAF‑batch node moves; skip <1px deltas
- Per‑id map updates; rewrite order arrays only on structural changes
- Wrap in `Y.transact(ydoc, fn, 'local')`

## Size guardrails
- Estimate snapshot size on client:
  - `size = new TextEncoder().encode(JSON.stringify({ nodes, edges })).length`
- If `size > 400KB`: auto‑fallback to presence‑only for session; toast + debug tag
- Optional: enable Liveblocks `largeMessageStrategy: 'upload'` if needed for seeding

## Subdocuments (optional)
- Split large areas: `ydoc.getSubdoc('graph')`, `ydoc.getSubdoc('notes:<nodeId>')`
- Use when large text editors live inside nodes

## Presence
- `cursor: { x, y } | null`, `name`, `color`
- 15–20 fps send; stop after 1.5s idle
- Convert screen→flow coords once; absolute position for overlay

## React Flow specifics
- Controlled state via store; memoize renderers
- Key by `id`; dedupe arrays before render
- Validate connections; prevent duplicates on `addEdge`

## Monitoring
- Client debug panel: status, others, fps, presence fps, heap, reconnect
- Server logs: auth status/latency; optional webhook `ydocUpdated`
- Admin tools:
  - Reset shared doc: `liveblocks.rooms.deleteRoomStorage({ roomId })`
  - Size probe via REST: `getYjsDocumentAsBinaryUpdate`

## Migration plan
1) Presence‑only (current branch) — baseline stable
2) Introduce Yjs size gate + local fallback
3) Map+Order model with rAF batching; keep heavy data in Supabase
4) Add reset tool + metrics
5) Optional subdocs for editor nodes

## References
- Liveblocks Yjs API: `@liveblocks/yjs` (`getYjsProviderForRoom`, `LiveblocksYjsProvider`)
- Node REST: `sendYjsBinaryUpdate`, `getYjsDocumentAsBinaryUpdate`, `deleteRoomStorage`
- Examples: Monaco/Slate/Quill + Yjs in Liveblocks docs


