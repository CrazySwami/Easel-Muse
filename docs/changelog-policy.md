# Changelog Policy (Easel Muse fork)

We maintain the changelog exclusively for work done in this fork. As of 2025-09-19, upstream release notes have been archived and replaced with a consolidated, semver-style log starting at v0.0.x to capture our bootstrapping milestones.

## Guidelines

- Summarize features by milestones rather than every commit.
- Prefer grouping by areas (Auth, Collaboration, Canvas, Billing) with concise bullets.
- Update `CHANGELOG.md` in the root; the Update Log page reads this file directly.
## Recent additions (template guidance)

- When adding cross-cutting UX like the Roadmap/Feedback board:
  - Summarize the end-user benefit first (single unified board, admin toggle, modal submission).
  - Note key backend bits (tables, API routes, enums) and any environment variables.
  - Mention navigation/slug changes and redirects.
  - Include a short “More coming soon…” line if the feature is intentionally iterative and will be expanded by follow-up notes.

- Include date ranges for each version to reflect active development windows.
- Note notable infra/config changes (Supabase, Next.js, Stripe) that affect deployments.

## Operational notes

- The Update Log UI at `app/update-log/page.tsx` renders the markdown as-is. Keep headings and lists simple.
- For long-running initiatives (e.g., Liveblocks + Yjs), capture the user-facing impact first, then technical highlights.
- Use `[skip ci]` in purely editorial changelog commits when appropriate.
