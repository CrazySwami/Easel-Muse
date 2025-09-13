# Liveblocks Integration — Presence, Cursors, and Collaborative Editing

This document captures how we added Liveblocks to the canvas (presence + live cursors) and sharing functionality, and how Yjs is wired for collaborative graph edits.

## Table of contents
- Why Liveblocks
- Packages and environment
- Server auth endpoint
- Client providers and joining rooms
- Presence model and live cursors on the canvas
- Sharing functionality
- Collaborative text‑editor node (Tiptap) — plan
- Storage & permissions
- Limits & troubleshooting
- References

## Why Liveblocks
Liveblocks provides realtime rooms, presence (ephemeral user state like cursor position), and storage for collaborative editors. It’s a good fit for:
- Live cursors on the XYFlow canvas
- Multi‑user text editing inside a node (Tiptap + Storage)

References: Liveblocks docs and examples: [Docs](https://liveblocks.io/docs), [Advanced Tiptap example](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced), and upgrade/auth notes in [Liveblocks LLM doc](https://liveblocks.io/llms-full.txt).

## Packages and environment
- Install: `@liveblocks/client @liveblocks/react @liveblocks/yjs yjs`
- Env (server): `LIVEBLOCKS_SECRET_KEY` from your Liveblocks dashboard (Project → API keys)

## Server auth endpoint
Create `/api/liveblocks-auth` (server only) that validates the current user, then calls Liveblocks to issue an ID token for the requested room.
- Use `@liveblocks/node` or REST per docs ([authorization](https://liveblocks.io/llms-full.txt#authorize-endpoint)).
- Required fields:
  - `room`: we’ll use `projectId` as `roomId`.
  - `userId`: stable unique user id (Supabase auth id).
  - `userInfo`: name/color (optional; used for UI labels).

## Client providers and joining rooms
At the canvas root we use an authenticated setup:

- `LiveblocksProvider` with `authEndpoint: '/api/liveblocks-auth'`
- `RoomProvider` with `id: projectId` and `initialPresence: { cursor: null }`
- `ClientSideSuspense` to keep hooks simple and to show a loading state

Status and participants are shown in the top‑right via `RoomStatus` (connected/connecting) and `AvatarStack` (up to 5 users).

## Presence model and live cursors on the canvas
- Presence shape: `{ cursor: { x, y } | null }` (color/name come from `userInfo` at auth)
- We translate screen → canvas coords with XYFlow viewport and throttle publishes to ~30ms
- On leave: `setMyPresence({ cursor: null })`
- Rendering maps presence back to screen coords (using current transform) and draws dots + optional labels

## Canvas and Yjs sync
- Yjs is enabled by default unless `localStorage.sync === 'off'`
- Data model in the shared `Y.Doc`:
  - `nodesMap: Y.Map<Node>` + `nodesOrder: Y.Array<string>`
  - `edgesMap: Y.Map<Edge>` + `edgesOrder: Y.Array<string>`
- Seeding: on first connect, we seed maps/orders from the project’s saved content
- Observers rebuild the local Zustand store when remote peers change the Y.Doc
- Writes are rAF‑batched and minimal:
  - Presence‑only drag: during drag we do not write to Yjs; we publish position via Presence and update local UI
  - Commit‑on‑drop: we write final positions to Yjs when dragging ends (or on structural edits like add/remove/connect)
  - Arrays are only rewritten if order actually changes

## Sharing functionality
- **Share Dialog**: Added to top-right corner with "Share" button.
- **Read-only links**: Generated with `?ro={token}` parameter for view-only access.
- **Invite links**: Generated with `/api/accept-invite?projectId={id}&invite={token}` for adding collaborators.
- **Access control**: 
  - Project owner and `project.members` get full edit access
  - Read-only token holders get presence-only access (can see cursors but cannot edit)
- **Database schema**: Added `readOnlyToken` and `inviteToken` columns to `projects` table.
- **Server actions**: `generateShareLinks()` creates both link types with unique tokens.

## Collaborative text‑editor node (Tiptap) — plan
Phase 2 adds a node that mounts a Tiptap editor with Liveblocks storage:
- Use `useLiveblocksExtension` from `@liveblocks/react-tiptap` to bind the editor to Liveblocks Storage (example: [Tiptap advanced](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced)).
- Presence in the editor (selection cursors) comes for free via the extension.
- Node data keeps local metadata (e.g., last updated), while content lives in Liveblocks Storage for true multi‑user edits.

## Storage, permissions & persistence
- The Liveblocks room stores the Yjs document server‑side; it persists between sessions
- Presence is ephemeral and not persisted
- We authorize via `/api/liveblocks-auth`: owner/members get FULL_ACCESS; read‑only token grants presence‑only

## Limits & troubleshooting
- Keep the shared Y.Doc structure‑only (id, type, position, connections). Heavy data (images, transcripts, long prompts) should live in Supabase and be referenced by id/url
- If an older room stops connecting with WS 1011 (premature close), its stored Y.Doc is likely too large/corrupted. Quick remedies:
  - Duplicate the project to a fresh room (works immediately)
  - Temporarily set presence‑only: `localStorage.setItem('sync','off'); location.reload()`
- Graph size debug (approximate):
  ```js
  const rf = window.reactFlowInstance?.toObject?.();
  if (rf) {
    const bytes = new TextEncoder().encode(JSON.stringify({ nodes: rf.nodes, edges: rf.edges })).length;
    console.log('graphKB ~', Math.round(bytes / 1024));
  }
  ```
- Performance knobs we use:
  - Presence‑only drag + commit‑on‑drop
  - rAF batching and minimal array rewrites
  - `selectionOnDrag=false`, memoized node components, `onlyRenderVisibleElements`

Planned hardening (optional):
- Liveblocks client options `{ throttle: 32, largeMessageStrategy: 'upload' }`
- Client/server size gate to auto‑fallback to presence‑only when the doc is too large

## References
- Liveblocks docs: <https://liveblocks.io/docs>
- Yjs discussion: <https://discuss.yjs.dev/>
