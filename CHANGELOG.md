# Easel Muse Changelog

This changelog reflects the work in the Easel Muse fork only. We consolidated the last 42 commits from our repository into v0.0.1 through v0.0.3 to capture the bootstrapping steps, core collaboration features, and authentication/UX polish.

## v0.0.9 — Architectural UI Overhaul & Node Consistency (2025-10-05 → 2025-10-11)

-   **Architectural Layout Fixes**
    -   Overhauled the core `NodeLayout` component to fix deep-seated CSS bugs that caused connector misalignment and inconsistent node sizing. This architectural change ensures all nodes are visually and logically consistent.
    -   Established and documented two official layout patterns in `ui-and-component-guide.md`: "Fill Frame" for fixed-size nodes and "Hug Content" for dynamically-sized nodes, eliminating guesswork for future development.
    -   The sizing contract is now enforced: a node's creation properties in `lib/node-buttons.ts` must match the internal component defaults to prevent layout discrepancies.

-   **Node UI & UX Enhancements**
    -   **Text Node**: The UI for both the primitive and transform modes of the Text node has been completely rewritten. They now share a consistent, larger frame size (`560x420`) and correctly implement our new layout patterns.
    -   The transform `Text` node now features a scrollable content area and a fixed prompt window, preventing the UI from breaking with long text generations.
    -   A **Copy button** has been added to the primitive `Text` node for feature parity with the transform mode.
    -   **Editor (Tiptap) Node**: Fixed a critical bug where the node's connectors were misaligned due to a conflict between the node's internal width and its creation width.

-   **New Web Renderer Node**
    -   Added a new **Web Renderer Node** that can render HTML from a connected `Code` node or a URL, built on the new robust "Fill Frame" layout pattern.

## v0.0.8 — New Nodes, Canvas UX, & Locking Refinements (2025-09-23 → 2025-10-04)

-   **New Nodes for Data Ingestion**
    -   Added a new **Firecrawl Node** to allow scraping and crawling websites directly on the canvas.
    -   Introduced a **Perplexity Search Node** to perform web searches and bring live data into your workflows.

-   **Canvas & UI Overhaul**
    -   The main canvas can now be **locked**, preventing any panning or zooming for a more stable editing experience.
    -   The top UI bar can now be **hidden by clicking the Easel logo** in the top-left, providing a distraction-free "Zen Mode."
    -   The bottom node-creation menu has been streamlined into a single **"+" button**, which now opens the command palette for a cleaner interface.

-   **Node UI & Interaction**
    -   Refactored the Text Node to use a **content-driven height** and a fixed header, ensuring the generation prompt is always visible while long text scrolls correctly.
    -   Established a new, consistent UI pattern for nodes with flexible content areas (`flex-1`) and fixed instruction areas (`shrink-0`).
    -   Tightened the **line height and paragraph spacing** in text nodes for a more compact and polished look.
    -   The primitive Text Node is now **always editable**, allowing users to type without first selecting the node.

-   **Enhanced Node Locking**
    -   Restored and improved the node locking functionality. The context menu now correctly displays "Unlocked," "Lock position only," and "Lock position & edits."
    -   Implemented robust **drag prevention for locked nodes**, ensuring they cannot be moved even during a multi-select operation.
    -   Added distinct visual feedback for different lock states, including **color-coded borders** and descriptive badges.

## v0.0.7 — Rich Text, Voice Memos, & Inspector UI (2025-09-22)

-   **New Tiptap Node**
    -   We've added a brand-new node powered by ***Tiptap*** for collaborative, rich text editing right on the canvas.
-   **Enhanced Voice Memo Node**
    -   The voice memo node has been upgraded and now includes an option for ***automatic transcription***.
-   **Inspector UI Improvements**
    -   The inspector panel has been updated with improved functionality, making it easier to manage and edit your nodes.
-   **Dependencies & Styling**
    -   We've updated our dependencies and global styles to support these new features and ensure a consistent, polished experience.

## v0.0.6 — Project Page & Advanced Debugging (2025-09-21)

<img src="/changelog/project-page-easel.gif" alt="New Project Page" class="changelog-gif" />

-   **New Project Page**
    -   After logging in, you will now land on a brand-new ***Project Page***. This central hub lets you see all your projects in one place.
    -   You can now easily track who created each project, when it was made, and perform actions like ***renaming and deleting*** projects.
-   **Advanced Debug Mode for Stress Testing**
    -   We've introduced a powerful new ***Debug Mode*** to help us test the platform's limits and ensure the live collaboration features are robust.
    -   This mode allows us to add a large number of nodes, connections, and trigger simultaneous generations to stress-test the system and identify performance bottlenecks.

## v0.0.5 — Quality of Life Improvements (2025-09-20)

-   **Canvas Interaction**
    -   Disabled the default text highlighting behavior that would occur when adding a new node, resulting in a cleaner and more focused user experience.
    -   Removed the two-finger swipe gesture for back-and-forward page navigation to prevent accidental navigation while working on the canvas.

## v0.0.4 — Branding, Changelog, & Stress Testing (2025-09-18 → 2025-09-19)

<iframe
  src="https://www.loom.com/embed/4e48a23a373341468f2e4e0f331ad4da?sid=ae014432-cdbf-4c1a-b545-1635d0632dad"
  width="100%"
  height="450"
  frameBorder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowFullScreen
></iframe>

-   **Branding & UI Updates**
    -   The project has been rebranded to ***Easel***! We've simplified and customized the home page to reflect the new branding.
-   **Live Collaboration & Sharing**
    -   The new ***Liveblocks and Zustand-powered*** collaboration system is live. We're currently stress-testing the platform to ensure a fluid, real-time experience.
    -   We've improved the share and invite link system with new roles:
        -   **View-only:** Users can interact with the canvas, but their changes will not be saved.
        -   **Edit:** Users have full collaborative power, and all changes are saved and synchronized in real time.
    -   Presence is fully enabled, so you can see user avatars and cursors.
-   **Changelog & Development**
    -   We've added this ***new changelog*** to keep you updated on all our progress. It's connected directly to our GitHub repository to ensure transparency.
    -   We're currently debugging a few minor issues with the new collaboration features and will be enhancing the system further.

## v0.0.3 — Auth, Permissions, Presence Polish (2025-09-12 → 2025-09-18)

-   **Authentication & Permissions**
    -   Implemented ***Supabase user authentication*** for all Liveblocks sessions, introducing robust access control based on user roles. Read-only tokens are now generated for guests, securing project data.
    -   Greatly improved Liveblocks auth error handling and logging, and refined the entire session preparation flow for a smoother, more reliable connection experience.
-   **Collaboration & Presence**
    -   Rebuilt our Liveblocks integration to use a <span class="text-accent">Zustand</span> store for state management, mirroring best practices for cleaner, more maintainable code.
    -   Merged Liveblocks Storage and Presence into this new system. Users can now seamlessly join a room directly from the Canvas, with fully functional live cursors and a synchronized React Flow board.
    -   Optimized presence updates by throttling them to `~30ms`, and now only commit final node positions on drop. We've also disabled `selection-on-drag` to significantly reduce re-renders during collaborative sessions.
-   **Canvas & Flow UX**
    -   Edges are now correctly pruned when a node is removed. Users can also ***alt/ctrl-click*** to quickly delete edges.
    -   Introduced an experimental <span class="text-accent">node locking</span> mechanism in the Canvas for safer manipulation of elements during collaboration.

## v0.0.2 — Realtime Collaboration Foundations (2025-09-09 → 2025-09-12)

<img src="/changelog/liveblocks-implementation-easel.gif" alt="Liveblocks Implementation Demo" class="changelog-gif" />

-   **Liveblocks + Yjs Integration**
    -   Integrated ***Liveblocks for realtime collaboration***, wiring up Yjs for shared state synchronization and live presence.
    -   Iteratively refactored the Canvas to use `Y.Map` structures for state management, which was later replaced by a more robust Zustand implementation.
-   **Sharing & Environment**
    -   Share links are now environment-aware and will always generate a production URL.
-   **Audio Pipeline**
    -   Implemented a full ***audio recording and transcription*** feature in the Audio node, complete with a polished UI and clear user feedback during processing.

## v0.0.1 — Repo Initialization, Billing, & Infrastructure (2025-08-28 → 2025-09-09)

<img src="/changelog/Supabase-Auth-profiles-Easel.gif" alt="Supabase Auth Demo" class="changelog-gif" />

-   **Project Initialization**
    -   Bootstrapped the official repository, cleaned up dependencies, and established the foundational infrastructure for the project.
-   **Supabase, Stripe, & Email**
    -   Upgraded the Supabase configuration to support Postgres 17 and enabled the `send-email` Edge Function, powered by ***SendGrid***, with JWT verification.
    -   Integrated <span class="text-accent">Stripe for billing (currently in test mode)</span>, including a webhook that gracefully handles the `checkout.session.completed` event and a system for credit tracking.
    -   Replaced Twitter with ***Google as the primary social authentication provider***.
-   **Performance & Configuration**
    -   Tuned the runtime by reducing the `maxDuration` for serverless functions from 13 minutes to 5, ensuring more responsive interactions.

---

### Tech highlights

-   **Core Frameworks:** Next.js 15, TypeScript (strict), Shadcn/UI, React Flow
-   **Collaboration:** Liveblocks (Presence, Storage) with a Zustand store for state management
-   **Backend:** Supabase (Auth, Database, Edge Functions)
-   **Services:** Stripe for billing and credit tracking (test mode), SendGrid for transactional emails, and Cloudflare for authentication.
-   **Tooling:** pnpm, ESLint (airbnb-base), Zod schemas, Vercel deployment

### Changelog policy

- We track features strictly from this fork, which is based on the original open-source [Tersa repository](https://github.com/haydenbleasel/tersa) by [Hayden Bleasel](https://x.com/haydenbleasel). Older upstream release notes were archived and replaced on 2025-09-19. The Update Log page renders this file directly.


