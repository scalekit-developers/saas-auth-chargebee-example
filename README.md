# Scalekit + Chargebee B2B billing reference app

Org-mode billing demo: Scalekit FSA auth, auth webhooks → Chargebee customers, hosted checkout, Chargebee webhooks → local subscription sync.

## Status

- Plans 001–007: implemented
- Blog draft: [drafts/10-scalekit-x-chargebee.md](../scalekit-blog/drafts/10-scalekit-x-chargebee.md)
- Design spec: [2026-06-12-scalekit-chargebee-design.md](../scalekit-blog/docs/superpowers/specs/2026-06-12-scalekit-chargebee-design.md)
- See [plans/README.md](./plans/README.md) for the full sequence

## Prerequisites

- Node 18+
- Scalekit environment with organization support (`oid` in access tokens)
- Chargebee sandbox site with a Product Catalog 2.0 plan item price
- LocalTunnel or ngrok for Scalekit + Chargebee webhooks during local dev

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push
npm run dev
```

Open http://localhost:3000 — sign in via Scalekit, then follow the integration guide at `/guide`.

## Environment

FSA plugin v1.4.1 conventions:

| Variable | Purpose |
|----------|---------|
| `SCALEKIT_ENV_URL` | Scalekit environment URL |
| `SCALEKIT_CLIENT_ID` / `SCALEKIT_CLIENT_SECRET` | OAuth client |
| `SCALEKIT_REDIRECT_URI` | `http://localhost:3000/auth/callback` |
| `NEXT_PUBLIC_APP_URL` | App base URL for hosted-page redirects |
| `SCALEKIT_WEBHOOK_SECRET` | Auth webhook signature verification |
| `CHARGEBEE_SITE` / `CHARGEBEE_API_KEY` | Chargebee API |
| `CHARGEBEE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY` | Chargebee.js Payment Components (publishable API key) |
| `NEXT_PUBLIC_CHARGEBEE_SITE` | Chargebee site id for client-side checkout |
| `CHARGEBEE_PLAN_ITEM_PRICE_ID` | Default plan (e.g. `growth-plan-monthly`) |
| `CHARGEBEE_GATEWAY_ACCOUNT_ID` | Payment gateway id for hosted checkout (e.g. `gw_...` from Chargebee dashboard) |
| `CHARGEBEE_WEBHOOK_USERNAME` / `CHARGEBEE_WEBHOOK_PASSWORD` | Chargebee webhook Basic Auth |
| `DATABASE_URL` | SQLite path (`file:./data/billing.db`) |

Session model: single HttpOnly `scalekit_session` cookie. Org billing uses `validateToken()` → claim **`oid`** (not `/userinfo`).

## Architecture

```
Scalekit org.created webhook → local organization + Chargebee customer
User login (FSA) → scalekit_session cookie
POST /api/subscription/create → future subscription row + hosted checkout
Chargebee checkout success → /api/subscription/success → /billing?success=1
Chargebee webhooks → sync subscription + items to SQLite
GET /api/subscription/list → billing UI
```

## Webhooks (local)

| Source | URL |
|--------|-----|
| Scalekit | `https://<tunnel-host>/api/webhooks/scalekit` |
| Chargebee | `https://<tunnel-host>/api/webhooks/chargebee` |

### Chargebee dashboard

1. **Settings → Configure Chargebee → Webhooks** → add endpoint.
2. URL: `https://<tunnel-host>/api/webhooks/chargebee`
3. Enable Basic Auth; match `.env` credentials.
4. Events: `subscription_created`, `subscription_activated`, `subscription_started`, `subscription_changed`, `subscription_renewed`, `subscription_scheduled_cancellation_removed`, `subscription_cancelled`, `customer_deleted`.
5. Set hosted-page redirect allowlist to include your tunnel URL and `http://localhost:3000`.

### Scalekit dashboard

1. **Webhooks** → add endpoint: `https://<tunnel-host>/api/webhooks/scalekit`
2. Events: `organization.created`, `organization.updated`, `organization.deleted`
3. Copy signing secret to `SCALEKIT_WEBHOOK_SECRET`

The Scalekit route verifies the **raw body** with `verifyWebhookPayload` and returns `200` after processing.

## Chargebee sandbox: payment gateway

Hosted checkout (`checkoutNewForItems`) requires at least one **test payment gateway** on your Chargebee site:

**Settings → Configure Chargebee → Payment Gateways** → add Stripe (test mode) or Chargebee Payments test.

If you see `no_applicable_gateway` / `configuration_incompatible`, set `CHARGEBEE_GATEWAY_ACCOUNT_ID` to your test gateway id from **Settings → Payment Gateways** (e.g. `gw_...`).

On sites without **Smart Routing**, Chargebee hosted checkout v4 can render billing fields but fail to load card inputs (`No Applicable gateways found` on `POST /api/v2/payment_intents`). This app detects that case and routes you to **`/billing/checkout`** instead, which uses Chargebee.js with a server-created payment intent pinned to your gateway. To use full-page hosted checkout redirects, enable Smart Routing in the Chargebee dashboard so gateways auto-select during checkout.

### Checkout should redirect back

A test gateway **should** complete hosted checkout and redirect to `http://localhost:3000/billing?success=1` (via `/api/subscription/success`). If you stay on the Chargebee page:

1. **Allowed redirect domains** — In Chargebee: **Settings → Configure Chargebee → Checkout & Self-Serve → Allowed redirect domains**, add `http://localhost:3000` (must match `NEXT_PUBLIC_APP_URL`).
2. **Test card** — Use a sandbox card such as `4111 1111 1111 1111` with any future expiry and CVC. Declined or invalid cards do not redirect.
3. **Trial checkout** — Growth plan has a 14-day trial ($0 due today); you still need a valid test card on file.
4. **Subscription in UI** — Redirect only confirms checkout. The active subscription appears after Chargebee webhooks sync (refresh `/billing` after a few seconds).

## 5-minute test script

1. Create an organization in Scalekit (or trigger `organization.created` webhook).
2. Confirm local `organization` row and Chargebee customer exist.
3. Log in at `/login` with a user in that org.
4. Open `/billing` → subscribe → complete Chargebee hosted checkout.
5. Confirm redirect to `/billing?success=1`.
6. Wait for Chargebee webhooks → refresh `/billing` → active subscription appears.

## Customization hooks

Edit `lib/subscription-hooks.ts` to plug in app logic:

- `onCustomerCreate` — after Chargebee customer is linked to an org
- `onSubscriptionCreated` / `onSubscriptionComplete` / `onSubscriptionUpdated` / `onSubscriptionDeleted` / `onSubscriptionCancel`
- `onTrialStart` / `onTrialEnd`
- `onAuthorizeReference` — return `false` to deny billing actions for a reference

## Why not a Scalekit plugin?

The [Chargebee Better Auth adapter](https://github.com/chargebee/js-framework-adapters/tree/main/packages/better-auth) targets Better Auth's plugin registry and session model. Scalekit FSA uses a single `scalekit_session` cookie and `oid` for org context. This sample ports the same billing flows (hosted checkout, future subscription pattern, webhook sync) as plain Next.js route handlers so teams using Scalekit can adopt Chargebee without Better Auth.

## API routes

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/session` | Session (`oid` required for billing) |
| POST | `/api/subscription/create` | Session + authorizeReference |
| POST | `/api/subscription/update` | Session + authorizeReference |
| GET | `/api/subscription/success` | Relative `callbackURL` only |
| POST | `/api/subscription/cancel` | Session → Chargebee portal |
| GET | `/api/subscription/cancel/callback` | Optional session |
| POST | `/api/subscription/portal` | Session + authorizeReference |
| GET | `/api/subscription/list` | Session + authorizeReference |
| POST | `/api/webhooks/scalekit` | Webhook signature |
| POST | `/api/webhooks/chargebee` | Basic Auth |