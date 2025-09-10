# Liveblocks Integration — Presence, Cursors, and Collaborative Editing

This document captures how we added Liveblocks to the canvas (presence + live cursors) and sharing functionality. Future phases will add collaborative text‑editor nodes.

## Table of contents
- Why Liveblocks
- Packages and environment
- Server auth endpoint
- Client providers and joining rooms
- Presence model and live cursors on the canvas
- Presence avatars & viewers
- Yjs collaboration for nodes/edges (React Flow)
- Sharing functionality
- Persistence (Liveblocks → Supabase)
- Storage & permissions
- Limits & troubleshooting
- References

## Why Liveblocks
Liveblocks provides realtime rooms, presence (ephemeral user state like cursor position), and storage for collaborative editors. It’s a good fit for:
- Live cursors on the XYFlow canvas
- Multi‑user text editing inside a node (Tiptap + Storage)

References: Liveblocks docs and examples: [Docs](https://liveblocks.io/docs), [Advanced Tiptap example](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced), and upgrade/auth notes in [Liveblocks LLM doc](https://liveblocks.io/llms-full.txt).

## Packages and environment
- Install:
  - `@liveblocks/client @liveblocks/react @liveblocks/yjs yjs`
  - `@liveblocks/react-tiptap @tiptap/react @tiptap/starter-kit` (for the editor phase)
- Env (server):
  - `LIVEBLOCKS_SECRET_KEY` from your Liveblocks dashboard (Project → API keys)
  - Optional: `LIVEBLOCKS_WEBHOOK_SECRET` (for ydocUpdated webhook)
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Server auth endpoint
`/api/liveblocks-auth` (server only) validates the current user via Supabase, then issues an access token for the requested room using `@liveblocks/node`.

We attach useful `userInfo` for presence UI:
- `name` (from `full_name`/`name`, fallback to email local‑part)
- `email`
- `avatar` (`avatar_url`/`picture` if present)
- `color` (stable hash of userId → palette)

## Client providers and joining rooms
At the canvas root:
- Wrap with `LiveblocksProvider` and `RoomProvider` from `@liveblocks/react/suspense`.
- `RoomProvider` options:
  - `id: projectId`
  - `authEndpoint: '/api/liveblocks-auth'`
  - `initialPresence: { cursor: null }` (presence is explicitly required; see upgrade notes)

## Presence model and live cursors on the canvas
- Presence shape: `{ cursor: { x, y } | null, color: string, name: string }`.
- Pointer move → presence: convert screen → flow coords with XYFlow `screenToFlowPosition`, publish with `requestAnimationFrame` for smoothness.
- Pointer up/leave: `setMyPresence({ cursor: null })`.
- Render: a `CursorsLayer` reads `useOthers()` and converts flow → screen using React Flow store `transform` plus pane `getBoundingClientRect()` to remain aligned under pan/zoom.

## Presence avatars & viewers
- A compact avatar stack renders in the canvas bottom‑right (inside the `RoomProvider`).
- Hover on a dot shows the user’s name (fallback: email). Clicking toggles a list with avatar or colored dot.
- Names/colors/avatars come from `userInfo` populated in the auth route.

## Yjs collaboration for nodes/edges (React Flow)
- Bind React Flow nodes/edges to a Yjs document using `@liveblocks/yjs`:
  - `const provider = getYjsProviderForRoom(room)`
  - `const ydoc = provider.getYDoc()`
  - `const yNodes = ydoc.getArray('nodes')`, `const yEdges = ydoc.getArray('edges')`
- Remote → React: observe arrays and `setNodes/setEdges` on change.
- Local → Remote: on React Flow `onNodesChange/onEdgesChange/onConnect`, compute next arrays and:
  ```ts
  Y.transact(ydoc, () => {
    yNodes.delete(0, yNodes.length);
    yNodes.insert(0, nextNodes);
  });
  ```
- UI‑only flags (selected/dragging) stay in presence, not in Yjs.
- Optional: `new Y.UndoManager([yNodes, yEdges])` for per‑user undo/redo.

## Sharing functionality
- **Share Dialog**: Added to top-right corner with "Share" button.
- **Read-only links**: `?ro={token}` parameter for view-only access.
- **Invite links**: `/api/accept-invite?projectId={id}&invite={token}` for adding collaborators.
- **Access control**: 
  - Project owner and `project.members` get full edit access
  - Read-only token holders get presence-only access (can see cursors but cannot edit)
- **Database schema**: `readOnlyToken` and `inviteToken` on `projects`.

## Persistence (Liveblocks → Supabase)
- Table:
  ```sql
  create table if not exists flow_docs (
    room_id text primary key,
    ydoc_json text not null,
    updated_at timestamptz default now()
  );
  ```
- Webhook route receives `ydocUpdated`, fetches the current Y doc via Liveblocks REST (`/v2/rooms/:roomId/ydoc`) and upserts to `flow_docs`.
- Webhook is throttled (~60s) by Liveblocks; no additional debounce needed.

## Storage & permissions
- Create the room dynamically (or rely on implicit creation) and assign room permissions server‑side using the REST API if needed.
- Use `userId` in the auth endpoint to match MAU requirements and control access.
- Avatars (optional): create a Supabase Storage bucket `avatars` (public), and allow authenticated writes to `auth.uid()/*`. The UI falls back to colored dots if no avatar is set.

## Limits & troubleshooting
- Always set `initialPresence` when joining a room.
- Presence is ephemeral; Storage is for persisted shared state.
- If cursors don’t appear: verify the room join succeeded (no auth error) and pointer events are throttled/converted to canvas coords.
- Cursor drift: ensure flow→screen uses React Flow store `transform` and pane `getBoundingClientRect()`; publish pointer updates with rAF.
- Ensure `@liveblocks/*`, `@xyflow/react`, and `yjs` versions are compatible.

## References
- Liveblocks docs: <https://liveblocks.io/docs>
- Tiptap collaborative example: <https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced>
- Liveblocks LLM helper doc (auth, upgrades): <https://liveblocks.io/llms-full.txt>
