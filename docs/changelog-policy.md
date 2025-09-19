# Changelog Policy (Easel Muse fork)

We maintain the changelog exclusively for work done in this fork. As of 2025-09-19, upstream release notes have been archived and replaced with a consolidated, semver-style log starting at v0.0.x to capture our bootstrapping milestones.

## Guidelines

- Summarize features by milestones rather than every commit.
- Prefer grouping by areas (Auth, Collaboration, Canvas, Billing) with concise bullets.
- Update `CHANGELOG.md` in the root; the Update Log page reads this file directly.
- Include date ranges for each version to reflect active development windows.
- Note notable infra/config changes (Supabase, Next.js, Stripe) that affect deployments.

## Operational notes

- The Update Log UI at `app/update-log/page.tsx` renders the markdown as-is. Keep headings and lists simple.
- For long-running initiatives (e.g., Liveblocks + Yjs), capture the user-facing impact first, then technical highlights.
- Use `[skip ci]` in purely editorial changelog commits when appropriate.
