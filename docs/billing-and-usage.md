# Billing and Usage

This document outlines the billing and usage credit system, which is a combination of Stripe's metered billing features and custom logic within the application.

## System Overview

The system is designed to provide users with a monthly allowance of "credits" that are consumed by performing actions with AI models. The core components are:

1.  **Stripe Products:** There are three key products configured in Stripe:
    *   **Easel Hobby:** A `$0/month` plan.
    *   **Easel Pro:** A paid plan (e.g., `$10/month`).
    *   **Easel Usage Credits:** A separate, dedicated product to track credit usage. It has no price itself.

2.  **Stripe Prices:** The "Easel Usage Credits" product has two **Prices** associated with it, one for each plan:
    *   A "Hobby" price with a tiered model providing 200 credits.
    *   A "Pro" price with a tiered model providing 1600 credits (monthly) and an optional annual variant.
    Both prices have a cost of `$0.00`, as the cost is covered by the main subscription plan.

3.  **Stripe Meter:** A single **Billing Meter** (e.g., `credits_consumed`) is used to track all usage events. Both of the tiered prices for "Easel Usage Credits" must be explicitly linked to this meter in the Stripe dashboard.

4.  **Application Logic:** The application code is responsible for calculating usage and reporting it to the meter.

## Required environment variables

Ensure these are configured and current:

- `STRIPE_HOBBY_PRODUCT_ID` (prod_…)
- `STRIPE_PRO_PRODUCT_ID` (prod_…)
- `STRIPE_USAGE_PRODUCT_ID` (prod_…)
- `STRIPE_HOBBY_USAGE_PRICE_ID` (price_… — 200-credit tier)
- `STRIPE_PRO_USAGE_PRICE_ID` (price_… — 1600-credit tier)
- `STRIPE_PRO_ANNUAL_USAGE_PRICE_ID` (price_… — optional annual credits tier)

After any env changes, restart the dev server.

## Checkout line items

Checkout always adds two line items:

- Main plan price (Hobby monthly or Pro monthly/annual)
- Matching usage price (Hobby usage or Pro monthly/annual usage)

This guarantees the invoice preview includes the correct usage line item for credit calculations.

## Credit Calculation and Tracking Flow

When a user performs a credit-consuming action (e.g., generating text):

1.  **Calculate Dollar Cost:** The application calculates the actual cost of the operation in USD. This is based on the specific AI model's price-per-token/second and the amount of usage.

2.  **Convert to Credits:** The dollar cost is then converted into a whole number of "credits". This logic is in `lib/stripe.ts`:
    ```typescript
    const creditValue = 0.005; // 1 credit = $0.005
    const credits = Math.ceil(cost / creditValue);
    ```
    The cost is divided by the value of a single credit, and then rounded up. This means even the smallest operation costs a minimum of 1 credit.

3.  **Report to Meter:** The final integer `credits` value is sent to the Stripe Billing Meter via a `meter_events` API call.

## Displaying Remaining Credits

To display the user's remaining credits, the `getCredits()` function is called. It works as follows:

1.  It asks Stripe for a preview of the user's next invoice.
2.  Stripe calculates this preview based on the total usage recorded on the **Billing Meter** for the current period.
3.  The application code then subtracts this total usage from the user's plan allowance (e.g., 200 or 1600) to determine the remaining credits.

### Important Note on Delays

There is a known delay of **several minutes** for usage reported to the meter to be reflected in the invoice preview. This is an expected characteristic of Stripe's asynchronous aggregation system. As a result, the credit counter in the UI will not update in real-time but will catch up after a few minutes.

## Verify credit deduction

Use these steps to verify that credits are being deducted correctly:

1. Stripe Dashboard (instant signal)
   - Go to Billing → Meters → select your meter (`STRIPE_CREDITS_METER_NAME`).
   - Open the Events tab and filter by the customer ID (e.g., `cus_...`).
   - After triggering an action in-app, you should see new meter events with a numeric `value`. These appear immediately when `meter_events.create` succeeds.

2. Stripe Dashboard (aggregated usage)
   - Go to Customers → select the customer → Subscriptions → open the subscription.
   - Click “Preview invoice” (or view Upcoming invoice).
   - Find the usage price line item (the one using `STRIPE_*_USAGE_PRICE_ID`). Its quantity reflects aggregated usage for the current period. This can lag by a few minutes.

3. Stripe CLI (preview upcoming invoice)
   - With the subscription ID:
   ```bash
   stripe invoices upcoming --subscription sub_XXXXXXXX | cat
   ```
   - Look for the usage line item and confirm the quantity increases after usage. If not visible yet, wait a few minutes and re-run.

4. App-side check (development)
   - Call `getCredits()` again after a few minutes. The value returned is computed as: plan allowance (e.g., 200/1600) minus the usage line item quantity from the invoice preview.
   - Server logs print the invoice line price IDs and quantities when `getCredits()` runs to aid debugging.

Notes
- Meter events are near-real-time, but invoice preview aggregation typically updates within 1–5 minutes.
- If meter events show up but the invoice preview never reflects usage, verify the usage prices are correctly linked to the Billing Meter in Stripe and that the checkout session attached the correct usage price ID.
