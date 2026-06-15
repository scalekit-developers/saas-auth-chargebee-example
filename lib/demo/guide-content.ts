export const VALUE_PROPS = [
  {
    title: 'Scalekit',
    subtitle: 'B2B identity and tenant context',
    bullets: [
      'Enterprise OIDC login and session management',
      'Organizations with `oid` in the access token for tenant-scoped billing',
      'Auth webhooks (`organization.created`) to provision billing customers',
    ],
  },
  {
    title: 'Chargebee',
    subtitle: 'Subscription billing',
    bullets: [
      'Product catalog and plan item prices',
      'Hosted checkout and customer self-serve portal',
      'Billing webhooks to keep your app database in sync',
    ],
  },
] as const;

export const ARCHITECTURE_FLOW = `Scalekit org.created webhook → local organization + Chargebee customer
User login (FSA) → scalekit_session cookie
POST /api/subscription/create → future subscription row + hosted checkout
Chargebee checkout success → /api/subscription/success → /billing?success=1
Chargebee webhooks → sync subscription + items to SQLite
GET /api/subscription/list → billing UI`;

export const FILE_MAP = [
  {
    path: 'lib/billing/create-org-customer.ts',
    role: 'Creates Chargebee customer when Scalekit org is provisioned',
  },
  {
    path: 'app/api/webhooks/scalekit/route.ts',
    role: 'Handles organization.created / updated / deleted',
  },
  {
    path: 'app/api/subscription/create/route.ts',
    role: 'Future subscription row + Chargebee hosted checkout',
  },
  {
    path: 'app/api/webhooks/chargebee/route.ts',
    role: 'Syncs subscription lifecycle events to SQLite',
  },
  {
    path: 'lib/subscription-hooks.ts',
    role: 'Customization hooks for your product logic',
  },
  {
    path: 'lib/billing/plans.ts',
    role: 'Plan catalog exposed to the billing UI',
  },
] as const;

export const API_ROUTES = [
  { method: 'GET', path: '/api/session', auth: 'Session (`oid` required for billing)' },
  { method: 'POST', path: '/api/subscription/create', auth: 'Session + authorizeReference' },
  { method: 'POST', path: '/api/subscription/update', auth: 'Session + authorizeReference' },
  { method: 'GET', path: '/api/subscription/success', auth: 'Relative callbackURL only' },
  { method: 'POST', path: '/api/subscription/cancel', auth: 'Session → Chargebee portal' },
  { method: 'POST', path: '/api/subscription/portal', auth: 'Session + authorizeReference' },
  { method: 'GET', path: '/api/subscription/list', auth: 'Session + authorizeReference' },
  { method: 'POST', path: '/api/webhooks/scalekit', auth: 'Webhook signature' },
  { method: 'POST', path: '/api/webhooks/chargebee', auth: 'Basic Auth' },
] as const;

export const SETUP_CHECKLIST = [
  'SCALEKIT_ENV_URL',
  'SCALEKIT_CLIENT_ID',
  'SCALEKIT_CLIENT_SECRET',
  'SCALEKIT_REDIRECT_URI',
  'NEXT_PUBLIC_APP_URL',
  'SCALEKIT_WEBHOOK_SECRET',
  'CHARGEBEE_SITE',
  'CHARGEBEE_API_KEY',
  'CHARGEBEE_PLAN_ITEM_PRICE_ID',
  'CHARGEBEE_GATEWAY_ACCOUNT_ID',
  'CHARGEBEE_WEBHOOK_USERNAME',
  'CHARGEBEE_WEBHOOK_PASSWORD',
  'DATABASE_URL',
] as const;

export const FIVE_MINUTE_SCRIPT = [
  'Create an organization in Scalekit (or trigger `organization.created` webhook).',
  'Confirm local `organization` row and Chargebee customer exist.',
  'Log in at `/login` with a user in that org.',
  'Open `/billing` → subscribe → complete Chargebee hosted checkout.',
  'Confirm redirect to `/billing?success=1`.',
  'Wait for Chargebee webhooks → refresh `/billing` → active subscription appears.',
] as const;

export const WHY_NOT_PLUGIN =
  'The Chargebee Better Auth adapter targets Better Auth\'s plugin registry and session model. Scalekit FSA uses a single `scalekit_session` cookie and `oid` for org context. This sample ports the same billing flows (hosted checkout, future subscription pattern, webhook sync) as plain Next.js route handlers so teams using Scalekit can adopt Chargebee without Better Auth.';

export const SUBSCRIBE_FLOW = [
  'App creates a `future` subscription row in SQLite and links it to your org.',
  'Chargebee hosted checkout opens for the plan item price.',
  'After payment (or trial start), Chargebee redirects back to your app.',
  'Chargebee webhooks update the local subscription to active or in_trial.',
] as const;

export const CHECKOUT_TROUBLESHOOTING = [
  'If Chargebee hosted checkout shows billing fields but no card form (or "No Applicable gateways found"), the site has no Smart Routing default. Set `CHARGEBEE_GATEWAY_ACCOUNT_ID` and `NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY` in `.env`; this app then uses `/billing/checkout` with Chargebee Payment Components and a server-created payment intent.',
  'Chargebee must allow your app URL: Settings → Configure Chargebee → Checkout & Self-Serve → Allowed redirect domains → add `http://localhost:3000` (or your tunnel URL if `NEXT_PUBLIC_APP_URL` points there).',
  'Use a sandbox test card (e.g. Visa `4111 1111 1111 1111`, any future expiry, any CVC). Declined cards stay on the payment step with an error.',
  'Growth plan starts a 14-day trial — checkout may show $0 due today but still requires a valid test card on file.',
  'Redirect only means checkout finished. The subscription card on `/billing` updates after Chargebee webhooks arrive (refresh after a few seconds).',
] as const;

export const HOOK_NAMES = [
  'onCustomerCreate',
  'onSubscriptionCreated',
  'onSubscriptionComplete',
  'onSubscriptionUpdated',
  'onSubscriptionDeleted',
  'onSubscriptionCancel',
  'onTrialStart',
  'onTrialEnd',
  'onAuthorizeReference',
] as const;