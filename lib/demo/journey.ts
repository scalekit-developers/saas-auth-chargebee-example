export type JourneyStepId =
  | 'env'
  | 'sign-in'
  | 'org-customer'
  | 'subscribe'
  | 'webhooks-sync'
  | 'customize';

export type JourneyStep = {
  id: JourneyStepId;
  title: string;
  description: string;
  expect: string;
  codeRef?: string;
};

export type JourneyStepState = 'done' | 'current' | 'pending';

export type JourneyStatus = {
  steps: Array<{ id: JourneyStepId; state: JourneyStepState }>;
  nextStepId: JourneyStepId;
  nextCta: { label: string; href: string };
};

const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: 'env',
    title: 'Configure environment',
    description:
      'Copy `.env.example`, set Scalekit and Chargebee credentials, run migrations, and expose webhooks with a tunnel.',
    expect: 'App runs at http://localhost:3000 with SQLite at `data/billing.db`.',
    codeRef: '.env.example',
  },
  {
    id: 'sign-in',
    title: 'Sign in with Scalekit',
    description:
      'Log in with a user that belongs to an organization. Billing uses the `oid` claim from your access token.',
    expect: 'HttpOnly `scalekit_session` cookie is set after OAuth callback.',
    codeRef: 'app/api/auth/callback/route.ts',
  },
  {
    id: 'org-customer',
    title: 'Link organization to Chargebee customer',
    description:
      'When Scalekit fires `organization.created`, the app creates a local org row and a Chargebee customer.',
    expect:
      'The `organization` table has a row for your org id with `chargebee_customer_id` populated.',
    codeRef: 'app/api/webhooks/scalekit/route.ts',
  },
  {
    id: 'subscribe',
    title: 'Subscribe via hosted checkout',
    description:
      'POST `/api/subscription/create` opens Chargebee hosted checkout for your org (reference id = `oid`).',
    expect:
      'You complete checkout on Chargebee and return to `/billing?success=1`.',
    codeRef: 'app/api/subscription/create/route.ts',
  },
  {
    id: 'webhooks-sync',
    title: 'Sync subscription from webhooks',
    description:
      'Chargebee webhooks update local `subscription` and `subscription_item` rows after checkout.',
    expect:
      'Refresh `/billing` — an active or in-trial subscription appears in the UI.',
    codeRef: 'app/api/webhooks/chargebee/route.ts',
  },
  {
    id: 'customize',
    title: 'Customize lifecycle hooks',
    description:
      'Plug in your app logic when customers and subscriptions are created, updated, or cancelled.',
    expect:
      'Server logs show hook calls from `lib/subscription-hooks.ts` during billing events.',
    codeRef: 'lib/subscription-hooks.ts',
  },
];

export function getJourneySteps(): JourneyStep[] {
  return JOURNEY_STEPS;
}

export function getJourneyStep(id: JourneyStepId): JourneyStep | undefined {
  return JOURNEY_STEPS.find((step) => step.id === id);
}

type JourneyInput = {
  isAuthenticated: boolean;
  hasOrg: boolean;
  hasChargebeeCustomer: boolean;
  hasActiveSubscription: boolean;
  checkoutJustCompleted?: boolean;
};

function stepStates(input: JourneyInput): Record<JourneyStepId, JourneyStepState> {
  const {
    isAuthenticated,
    hasOrg,
    hasChargebeeCustomer,
    hasActiveSubscription,
    checkoutJustCompleted,
  } = input;

  const env: JourneyStepState = 'done';
  const signIn: JourneyStepState = isAuthenticated ? 'done' : 'current';
  const orgCustomer: JourneyStepState = !isAuthenticated
    ? 'pending'
    : !hasOrg
      ? 'current'
      : hasChargebeeCustomer
        ? 'done'
        : 'current';
  const subscribe: JourneyStepState = !hasOrg || !hasChargebeeCustomer
    ? 'pending'
    : hasActiveSubscription
      ? 'done'
      : 'current';
  const webhooksSync: JourneyStepState = !hasActiveSubscription
    ? checkoutJustCompleted
      ? 'current'
      : 'pending'
    : 'done';
  const customize: JourneyStepState = hasActiveSubscription ? 'current' : 'pending';

  if (hasActiveSubscription) {
    return {
      env: 'done',
      'sign-in': 'done',
      'org-customer': 'done',
      subscribe: 'done',
      'webhooks-sync': 'done',
      customize: 'current',
    };
  }

  return {
    env,
    'sign-in': signIn,
    'org-customer': orgCustomer,
    subscribe,
    'webhooks-sync': webhooksSync,
    customize,
  };
}

function resolveNext(
  states: Record<JourneyStepId, JourneyStepState>
): { nextStepId: JourneyStepId; nextCta: { label: string; href: string } } {
  const order = JOURNEY_STEPS.map((s) => s.id);
  const current = order.find((id) => states[id] === 'current') ?? 'customize';

  const ctas: Record<JourneyStepId, { label: string; href: string }> = {
    env: { label: 'Open setup checklist', href: '/guide#setup' },
    'sign-in': { label: 'Sign in', href: '/login' },
    'org-customer': { label: 'View org webhook docs', href: '/guide#architecture' },
    subscribe: { label: 'Go to billing', href: '/billing' },
    'webhooks-sync': { label: 'Refresh billing', href: '/billing' },
    customize: { label: 'View hook file map', href: '/guide#customize' },
  };

  return { nextStepId: current, nextCta: ctas[current] };
}

export function computeJourneyStatus(input: JourneyInput): JourneyStatus {
  const states = stepStates(input);
  const { nextStepId, nextCta } = resolveNext(states);

  return {
    steps: JOURNEY_STEPS.map((step) => ({
      id: step.id,
      state: states[step.id],
    })),
    nextStepId,
    nextCta,
  };
}