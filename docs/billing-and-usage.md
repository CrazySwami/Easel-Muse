# Documentation: Billing, Usage, and Supabase Integration

This document outlines the architecture for handling user subscriptions and tracking metered usage within the application. The system integrates Supabase for user management and Stripe for billing.

## Core Concept: Pay-As-You-Go Metered Billing

The application does **not** use a pre-paid credit system (e.g., buying a pack of 100 credits). Instead, it operates on a **post-paid, metered usage** model, often called "pay-as-you-go."

Here's the logic:
1.  A user subscribes to a plan (e.g., "Hobby" or "Pro").
2.  This subscription gives them the *right* to use the AI features.
3.  Every time they use a feature (like generating an image), the application records that single usage event with Stripe.
4.  At the end of the billing cycle (e.g., at the end of the month), Stripe bills the user based on the total number of usage events recorded.

The "You have no credits" message in the UI is functionally a "You have no active subscription" check.

## 1. Supabase: The User & Subscription Hub

Supabase acts as the central database for user data and their subscription status.

### Key Table: `profile`

The `profile` table in `schema.ts` is the most important piece of this puzzle. Each user in `auth.users` has a corresponding entry here.

-   `id`: Foreign key to `auth.users.id`.
-   `customerId`: The user's unique ID in Stripe. This is created the first time they go to the checkout.
-   `subscriptionId`: The ID of the user's **active** subscription in Stripe. **This is the most critical field.** If this is `null`, the user is considered "unsubscribed."
-   `productId`: The ID of the Stripe Product the user is subscribed to (e.g., "Hobby Plan," "Pro Plan").

When a user signs up via Supabase Auth, a new row is automatically created in the `profile` table. Initially, the Stripe-related fields are `null`.

## 2. Stripe Integration: From Checkout to Active Subscription

This is the process that connects a user to a paid plan.

### Step A: The Checkout Process (`/api/checkout`)

1.  A user clicks a "Subscribe" button in the UI.
2.  The frontend calls the `/api/checkout` serverless function.
3.  This function uses the `STRIPE_SECRET_KEY` to create a new Stripe Checkout Session.
4.  Crucially, it attaches the user's Supabase `id` to the session's **metadata**.
5.  The user is redirected to the Stripe-hosted checkout page.

### Step B: The Webhook (`/api/webhooks/stripe`)

1.  The user successfully pays on the Stripe page.
2.  Stripe sends a `checkout.session.completed` event to our webhook endpoint.
3.  The webhook verifies the request came from Stripe using the `STRIPE_WEBHOOK_SECRET`.
4.  The handler code extracts the `userId` from the metadata and the new `subscriptionId` and `customerId` from the session object.
5.  It then **updates the user's row in the Supabase `profile` table**, filling in the previously `null` Stripe-related fields.

At this point, the user is officially considered "subscribed" by our application.

## 3. Metered Usage: Tracking API Calls

This is how the application reports usage to Stripe.

### Step A: The Gatekeeper (`getSubscribedUser`)

-   Before any expensive AI operation (e.g., in `app/actions/image/create.ts`), the code first calls `getSubscribedUser()`.
-   This function checks the user's `profile` in the database. If `subscriptionId` is **not `null`**, the check passes, and the user can proceed.
-   If `subscriptionId` is `null`, it throws an error, which the UI displays as "You need to claim your free credits."

### Step B: Reporting Usage (`trackCreditUsage`)

1.  After the AI operation is successfully completed, the code calls the `trackCreditUsage()` function.
2.  This function takes a `cost` parameter, which is almost always `1`.
3.  It makes an API call to Stripe's "Usage Records" endpoint.
4.  It tells Stripe: "Increment the usage for meter `STRIPE_CREDITS_METER_ID` by 1 for subscription `[user's subscriptionId]`."

This action is idempotent; Stripe ensures that the same usage event isn't recorded twice. It simply adds one to the running total for the user's billing period.

## Summary of Key Environment Variables

-   `POSTGRES_URL`: Connects the app to the Supabase database to read the `profile` table.
-   `STRIPE_SECRET_KEY`: Allows the app to create checkout sessions and manage Stripe objects.
-   `STRIPE_WEBHOOK_SECRET`: Allows the app to securely verify that incoming webhook events are genuinely from Stripe.
-   `STRIPE_CREDITS_METER_ID`: The specific ID of the usage meter in Stripe that the app should report usage to.
