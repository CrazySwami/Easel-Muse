# Liveblocks Integration — Presence, Storage sync, and Sharing

This document explains our current Liveblocks setup for realtime presence (cursors) and shared graph state (nodes/edges) using Zustand. We do not use Yjs for the graph—Liveblocks Storage is the single source of truth for nodes and edges. Yjs remains an optional add‑on for future rich‑text nodes.

## Table of contents
- What we use Liveblocks for
- Packages and environment
- Client provider and room lifecycle
- Store: Liveblocks + Zustand mapping
- Presence model (cursors)
- Persistence with Supabase
- Auth & access control (Supabase)
- Sharing (read‑only/invite)
- Limitations & troubleshooting
- Stress testing checklist
- When to add Yjs
- References

## What we use Liveblocks for
- Presence: who is in the room + live cursors.
- Storage: shared graph structure (nodes, edges). Any change to nodes/edges syncs to all clients.

## Packages and environment
- Install: `@liveblocks/client @liveblocks/react @liveblocks/zustand`
- Env (choose ONE path):
  - Client‑only: `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_…` and enable Public Client API in the dashboard (allow localhost origin and your room id pattern)
  - Server auth: `LIVEBLOCKS_SECRET_KEY=sk_…` and `LiveblocksProvider` with `authEndpoint: '/api/liveblocks/auth'`

## Client provider and room lifecycle
- Global provider: `LiveblocksProvider` (public key or authEndpoint)
- Per‑project: `RoomProvider id={projectId}` and `initialPresence={{ cursor: null }}`
- Page wraps the canvas with `LiveblocksProvider → RoomProvider`
- Top‑right shows `RoomStatus` and `AvatarStack`

## Store: Liveblocks + Zustand mapping
- We wrap our Zustand store with `liveblocks` middleware and map:
  - `storageMapping: { nodes: true, edges: true }`
- Store exposes React Flow handlers that only update the store:
  - `onNodesChange(changes) => set({ nodes: applyNodeChanges(changes, nodes) })`
  - `onEdgesChange(changes) => set({ edges: applyEdgeChanges(changes, edges) })`
  - `onConnect(conn) => set({ edges: addEdge(conn, edges) })`
- In the canvas, we also call `useFlowStore().liveblocks.enterRoom(projectId, { initialStorage: { nodes, edges } })` so Storage is joined and seeded.

Effect: Any node/edge edit on one tab syncs to all other tabs connected to the same `projectId` room.

## Presence model (cursors)
- Presence shape: `{ cursor: { x, y } | null }`
- We convert screen → flow coords with `screenToFlowPosition` and publish at ~16–32ms.
- Rendering converts back to screen coords with the current viewport transform, so dots are stable under pan/zoom.

## Persistence with Supabase
- Supabase stores project snapshots (for loading into a fresh room) and shares/permissions.
- We do NOT save on every drag. We debounce save (e.g., 1s) and persist `reactFlowInstance.toObject()` to Supabase.
- First client to open a fresh room seeds Storage from the project snapshot; subsequent clients load from Storage.

## Auth & access control (Supabase)
- Route: `app/api/liveblocks/auth/route.ts` (Node runtime)
  - Reads `LIVEBLOCKS_SECRET_KEY`
  - Gets the authenticated user from Supabase (server): `createSupabase().auth.getUser()`
  - Loads project by `roomId == projectId` and determines permission:
    - Owner or member → `FULL_ACCESS` (write)
    - Read‑only token (`?ro=`) matches → `READ_ACCESS` (presence only)
    - Otherwise → `READ_ACCESS`
  - Calls `prepareSession(userId, { userInfo })` (name/email/avatar) and `session.allow(roomId, permission)`

Environment & config
- Local/prod: set only `LIVEBLOCKS_SECRET_KEY` (leave `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` unset so the client uses the secret path)
- Verify with: `GET /api/liveblocks/auth?room=lb-health` → 200 returns a token
- Vercel: ensure the route is not Edge (we export `export const runtime = 'nodejs'`)

## Sharing (read‑only/invite)
- Read‑only token holders see presence and the graph but cannot edit.
- Invite links add collaborators (project members) with full edit access.
- Tokens and membership are stored in Supabase; the Liveblocks room controls real‑time sync.

## Limitations & troubleshooting
- Public key path: ensure Public Client API is enabled, origin is allowed (http://localhost:3000 in dev), and the room id pattern matches your `projectId`. Otherwise you’ll see “no access (4001)”.
- Server auth path: `/api/liveblocks/auth` must return 200 with a token. A 500 usually means the secret is missing/invalid.
- Room seeding: the first tab wins. If a second tab shows an empty graph, refresh after the first tab saves/joins.
- Payload size: keep node/edge data lean (ids, positions, connections). Heavy fields (images, transcripts) should live in Supabase and be referenced.
- Don’t write to DB during drag; debounce saves to avoid jank and overwrites.

## Stress testing checklist
- Tabs: open 5–10 tabs on the same room; drag nodes simultaneously. Expect smooth sync with minor last‑writer‑wins on position.
- Throttle: try `{ throttle: 16 }` and `{ throttle: 32 }` in `createClient` to balance bandwidth vs latency.
- Graph size: measure with
  ```js
  const rf = window.reactFlowInstance?.toObject?.();
  const bytes = new TextEncoder().encode(JSON.stringify({ nodes: rf.nodes, edges: rf.edges })).length;
  console.log('graphKB ~', Math.round(bytes / 1024));
  ```
  Aim to keep under a few hundred KB for best realtime responsiveness.
- Save pressure: simulate rapid edits and ensure debounced saves don’t conflict (no server errors in Network).

## When to add Yjs
- If you add rich‑text nodes or need offline edits/complex merges within a field, add Yjs for that specific content, not for the whole graph. Keep nodes/edges in Liveblocks Storage; mount Yjs only inside nodes that need Google‑Docs‑style editing.

## Tiptap Collaborative Editor with Comments

### Overview
The Tiptap editor node integrates Liveblocks Yjs for real-time collaborative editing and commenting. Each editor instance maintains two Yjs structures:
- **YXmlFragment** for the editor content (via `@liveblocks/react-tiptap`)
- **YMap** for comment threads and replies

### Comment Data Structure

Comments are stored in a Yjs Map with the following structure:

```typescript
type CommentThread = {
  id: string;                    // Unique nanoid
  text: string;                  // Comment body
  userId: string;                // From Liveblocks session
  userName: string;              // From userInfo (name field)
  userAvatar?: string;           // From userInfo (avatar field)
  userColor?: string;            // From userInfo (color field)
  timestamp: string;             // ISO 8601 timestamp
  resolved: boolean;             // Resolution status
  replies: Array<{
    id: string;
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    timestamp: string;
  }>;
};
```

Comments are keyed by their `commentId` in the YMap: `doc.getMap('tiptap-comments-${nodeId}')`.

### How Commenting Works

1. **Creating a Comment**
   - User selects text in the editor
   - Clicks "Add Comment" button
   - A custom `comment` mark is applied to the selected text with attributes: `commentId`, `userId`, `userName`, `userColor`
   - A `CommentThread` object is stored in the Yjs Map
   - The highlighted text is rendered with the user's color as background

2. **Real-time Sync**
   - The Yjs Map is observed for changes via `yCommentsMap.observe(observer)`
   - Any changes to comments (add, edit, resolve, reply) sync to all connected clients automatically
   - Comment highlights in the editor update via Tiptap's mark system

3. **Comment Display**
   - **Inline**: Commented text is highlighted with the commenter's color
   - **Sidebar**: A fixed right panel lists all comment threads with replies
   - Clicking highlighted text focuses the comment in the sidebar
   - Clicking a comment in the sidebar selects the corresponding text

4. **User Identification**
   - Uses `useSelf()` hook from Liveblocks to get current user info
   - User info (name, avatar, color) is set in `/api/liveblocks/auth/route.ts` from Supabase metadata
   - Comments display the actual user name, not a generic "User #123"

### Extensions Used

#### Custom Extensions
- **FontSize**: Adds pixel-based font sizing (8px-64px) via `textStyle` mark
- **Comment**: Custom mark extension for comment highlights with user attribution

#### Third-Party Extensions
- `@tiptap/extension-text-style` - Required for font family and size
- `@tiptap/extension-font-family` - Font family dropdown
- `@tiptap/extension-color` - Text color support
- `@tiptap/starter-kit` - Base editor features (bold, italic, lists, headings)
- `@liveblocks/react-tiptap` - Yjs-based collaboration for editor content

### Font Controls

The toolbar includes:
- **Font Family Dropdown**: Arial, Times New Roman, Georgia, Courier New, Verdana, Helvetica, System UI
- **Font Size Dropdown**: Pixel-based sizes from 8px to 64px
- Font changes are applied via `setFontFamily()` and `setFontSize()` commands

### Performance Considerations

- **Comment Storage**: Comments are lightweight JSON objects in Yjs Map; ~100-200 bytes per comment thread
- **Sync Frequency**: Yjs handles conflict resolution automatically; updates propagate in <100ms
- **Large Documents**: If a document has >100 comments, consider implementing pagination or filtering in the sidebar
- **Memory**: Each comment thread + replies adds minimal overhead; YMap scales well to thousands of items

### Extending the Commenting System

To add new features:

1. **Edit Comments**: Add an `editComment` function that updates the thread text in the YMap
2. **Comment Notifications**: Subscribe to YMap changes and trigger notifications when a new reply is added
3. **Comment Search**: Filter `Object.values(comments)` by text content or author
4. **Comment Export**: Serialize the YMap to JSON for PDF/email reports
5. **Rich Text Comments**: Replace the simple text input with a mini Tiptap editor for formatted comments

### Troubleshooting Comments

- **Comments not syncing**: Verify Liveblocks provider is connected and YMap is properly initialized
- **User names showing as "Anonymous"**: Check that `/api/liveblocks/auth` is returning `userInfo` with `name` field
- **Highlight colors not showing**: Ensure the `userColor` attribute is being passed and the CSS is not overriding the inline style
- **Sidebar not opening**: Check that `sidebarOpen` state is toggling and the sidebar component is rendered conditionally
- **Comments persist after deletion**: Ensure `yCommentsMap.delete(commentId)` is called and the editor marks are properly removed

## References
- Liveblocks docs: <https://liveblocks.io/docs>
- React Flow: <https://reactflow.dev/>
- Tiptap docs: <https://tiptap.dev/>
- Yjs docs: <https://docs.yjs.dev/>
