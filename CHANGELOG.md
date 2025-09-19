# Easel Muse Changelog

This changelog reflects the work in the Easel Muse fork only. We consolidated the last 42 commits from our repository into v0.0.1 through v0.0.3 to capture the bootstrapping steps, core collaboration features, and authentication/UX polish.

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


