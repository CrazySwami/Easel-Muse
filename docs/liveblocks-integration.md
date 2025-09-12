# Liveblocks Integration — Presence, Cursors, and Collaborative Editing

> Branch note: This branch (`liveblocks-working-no-yjs`) runs Liveblocks presence (cursors, avatars) without Yjs graph sync. See the Yjs blueprint in `docs/liveblocks-yjs-blueprint.md` for the planned data model and performance guardrails when we re‑enable shared editing.

This document captures how we added Liveblocks to the canvas (presence + live cursors) and sharing functionality. Future phases will add collaborative text‑editor nodes.

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
- Install:
  - `@liveblocks/client @liveblocks/react`
  - `@liveblocks/react-tiptap @tiptap/react @tiptap/starter-kit` (for the editor phase)
- Env (server):
  - `LIVEBLOCKS_SECRET_KEY` from your Liveblocks dashboard (Project → API keys)

## Server auth endpoint
Create `/api/liveblocks-auth` (server only) that validates the current user, then calls Liveblocks to issue an ID token for the requested room.
- Use `@liveblocks/node` or REST per docs ([authorization](https://liveblocks.io/llms-full.txt#authorize-endpoint)).
- Required fields:
  - `room`: we’ll use `projectId` as `roomId`.
  - `userId`: stable unique user id (Supabase auth id).
  - `userInfo`: name/color (optional; used for UI labels).

## Client providers and joining rooms
At the canvas root:
- Wrap with `LiveblocksProvider` and `RoomProvider` from `@liveblocks/react/suspense`.
- `RoomProvider` options:
  - `id: projectId`
  - `authEndpoint: '/api/liveblocks-auth'`
  - `initialPresence: { cursor: null, color, name }` (presence is explicitly required; see [upgrade note](https://liveblocks.io/llms-full.txt#upgrade-steps))

Reference files in this repo (presence‑only setup):
- `providers/liveblocks-provider.tsx` — wraps app with `LiveblocksProvider` and `authEndpoint`.
- `providers/liveblocks.tsx` — `RoomProvider`, cursors layer, debug panel hooks.
- `app/api/liveblocks-auth/route.ts` — server auth endpoint issuing ID tokens, Supabase‑backed access control.
- `app/(authenticated)/projects/[projectId]/page.tsx` — provider composition around the canvas.

## Presence model and live cursors on the canvas
- Presence shape: `{ cursor: { x, y } | null, color: string, name: string }`.
- On pointer move: translate screen → canvas coords with XYFlow viewport; throttle to ~16–30ms; `setMyPresence({ cursor: { x, y } })`.
- On pointer up/leave: `setMyPresence({ cursor: null })`.
- Render: a `CursorsLayer` maps `useOthers()` presence to absolutely positioned cursors; fade if idle.

## Canvas drops and room scoping
- Users in the same project (room) see each other immediately.
- Room id = `projectId`, so reloading keeps everyone in the same space.

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
- Use `useLiveblocksExtension` from `@liveblocks/react-tiptap` to bind the editor to Storage (shared Yjs under the hood; example: [Tiptap advanced](https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced)).
- Presence in the editor (selection cursors) comes for free via the extension.
- Node data keeps local metadata (e.g., last updated), while content lives in Liveblocks Storage for true multi‑user edits.

## Storage & permissions
- Create the room dynamically (or rely on implicit creation) and assign room permissions server‑side using the REST API if needed. See [ID tokens & permissions](https://liveblocks.io/llms-full.txt#upgrade-to-id-tokens).
- Use `userId` in the auth endpoint to match MAU requirements and control access.

## Limits & troubleshooting
- Always set `initialPresence` when joining a room.
- Presence is ephemeral; Storage is for persisted shared state.
- If cursors don’t appear: verify the room join succeeded (no auth error) and pointer events are throttled/converted to canvas coords.
- For Tiptap: ensure all `@liveblocks/*` and `@tiptap/*` packages use compatible versions; see Quickstart in [docs](https://liveblocks.io/llms-full.txt#quickstart).

## References
- Liveblocks docs: <https://liveblocks.io/docs>
- Tiptap collaborative example: <https://liveblocks.io/examples/collaborative-text-editor-advanced/nextjs-tiptap-advanced>
- Liveblocks LLM helper doc (auth, upgrades): <https://liveblocks.io/llms-full.txt>
