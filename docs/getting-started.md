# Getting Started — Base Technical Foundation

A concise install-and-configure guide to run locally and deploy to production.

## 1) Prerequisites
- Node 20+, pnpm 10+
- Supabase CLI
- Stripe account (for billing/credits)
- Resend account (for transactional emails)
- Vercel account (optional, recommended)

## 2) Clone & Install
```bash
pnpm install
```
(Check in the updated `pnpm-lock.yaml` so CI/production installs are reproducible.)

## 3) Supabase — Local
- Start local stack:
```bash
supabase start
```
- Studio → Authentication → URL Configuration
  - Site URL: `http://localhost:3000`
  - Redirect URLs: `http://localhost:3000/*`
- Storage → Create bucket `files` (Public ON)
  - Policies: public read; authenticated users can write to `auth.uid()/*`
- Auth Hooks → Send Email
  - Type: HTTP endpoint
  - Endpoint: `http://host.docker.internal:3000/api/webhooks/resend`
  - Secret: `v1,whsec_...` (matches your local `.env.local`)
- Ensure “profile on user create” trigger exists in your DB. If missing, apply the migration and backfill as in `docs/supabase-workflow.md`.

## 4) Environment — Local (.env.local)
Required keys (minimal):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
RESEND_TOKEN=re_...
RESEND_EMAIL=no-reply@yourdomain.com
SUPABASE_AUTH_HOOK_SECRET=v1,whsec_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_HOBBY_PRODUCT_ID=prod_...
STRIPE_PRO_PRODUCT_ID=prod_...
STRIPE_HOBBY_USAGE_PRICE_ID=price_...
STRIPE_PRO_USAGE_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_USAGE_PRICE_ID=price_... # optional
STRIPE_CREDITS_METER_NAME=credits_consumed
STRIPE_CREDITS_METER_ID=mtr_...
AI_GATEWAY_API_KEY=...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
```
(Include other provider keys as needed.)

## 5) Run Locally
```bash
pnpm dev
```
- Validations:
  - Auth emails: use Supabase Studio “Send magic link/reset” → see POST 200 at `/api/webhooks/resend`.
  - Stripe test checkout: complete a session from the UI → see POST 200 at `/api/webhooks/stripe` and profile updated.
  - Generate an image/video → Supabase `files` shows new object; UI renders via public URL.

## 6) Stripe — Test Mode
- Create test products/prices and usage prices. Link usage prices to a Billing Meter.
- Add a Test webhook endpoint for `https://localhost-or-your-dev-tunnel/api/webhooks/stripe` or use Stripe CLI `listen` to forward to `localhost:3000`.
- Set the Test `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## 7) Production Deploy
- Supabase project (prod):
  - Auth URL Configuration: Site URL `https://your-domain`, Redirect `https://your-domain/*`
  - Auth Hook: endpoint `https://your-domain/api/webhooks/resend`, secret `v1,whsec_...`
  - Storage: ensure bucket `files` exists and policies are set
  - Apply DB migration + backfill if this is a fresh DB
- Vercel (Production) env vars: copy all required keys, using Live or Test consistently
  - For Live Stripe, create a Live webhook; set Live `STRIPE_WEBHOOK_SECRET`
- Next.js image config: `next.config.ts` resolves `NEXT_PUBLIC_SUPABASE_URL` to allow Supabase storage host
- Redeploy, then validate:
  - Email sign‑up → inbox gets link; POST 200 on `/api/webhooks/resend`
  - Stripe checkout → POST 200 on `/api/webhooks/stripe`; profile gets `customerId/subscriptionId/productId`
  - Generate → files appear in Supabase; UI renders

## 8) Billing & Credits
- Global credit value: `lib/stripe.ts` (`creditValue`), default 1 credit = $0.005
- Per‑model cost: each registry `getCost(...)` (Image/Video/Speech/Transcription)
- Remaining credits: see `docs/billing-and-usage.md` (invoice preview; a few minutes lag)

## 9) Models & Providers
- Registries:
  - Image: `lib/models/image/index.ts`
  - Video: `lib/models/video/index.ts`
  - Speech: `lib/models/speech.ts`
  - Transcription: `lib/models/transcription.ts`
  - Vision: `lib/models/vision.ts`
- Gateway client: `lib/gateway.tsx`
- Gemini 2.5 Flash (Image Preview) via Gateway: generateText + `providerOptions.google.responseModalities=['TEXT','IMAGE']` for generate/edit

## 10) Common Pitfalls
- 400 at `/api/webhooks/stripe`: wrong (test vs. live) webhook secret
- 405 GET on `/api/webhooks/resend`: browser GET isn’t supported; must be POST from Supabase hook
- Images broken: `next.config.ts` host mismatch or non‑public bucket
- “User profile not found”: run the profile trigger/backfill on the DB

## Appendix — Links
- Stripe Dashboard → Developers → Webhooks (Test/Live)
- Supabase → Auth → URL Configuration / Hooks / Storage
- See `docs/node-development.md` and `docs/model-management.md` for node behavior, flows, and model details.
