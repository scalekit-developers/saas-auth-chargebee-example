import { NextResponse } from 'next/server';
import { requireSession, SessionError } from '@/lib/auth/require-session';
import { getAppUrl } from '@/lib/billing/checkout';
import { computeJourneyStatus } from '@/lib/demo/journey';
import { getOrganizationById } from '@/lib/db/organizations';
import { findActiveByReferenceId } from '@/lib/db/subscriptions';
import { getSession } from '@/lib/cookies';

export const runtime = 'nodejs';

function checkoutRedirectInfo() {
  const appUrl = getAppUrl();
  return {
    appUrl,
    successRedirectExample: `${appUrl}/api/subscription/success?callbackURL=%2Fbilling%3Fsuccess%3D1&subscriptionId=<local-sub-id>`,
    finalLandingPath: '/billing?success=1',
    gatewayConfigured: Boolean(process.env.CHARGEBEE_GATEWAY_ACCOUNT_ID?.trim()),
  };
}

export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({
      isAuthenticated: false,
      hasOrg: false,
      hasChargebeeCustomer: false,
      hasActiveSubscription: false,
      checkout: checkoutRedirectInfo(),
      journey: computeJourneyStatus({
        isAuthenticated: false,
        hasOrg: false,
        hasChargebeeCustomer: false,
        hasActiveSubscription: false,
      }),
    });
  }

  try {
    const ctx = await requireSession();
    const org = await getOrganizationById(ctx.organizationId);
    const activeSub = await findActiveByReferenceId(ctx.organizationId);

    const hasChargebeeCustomer = Boolean(org?.chargebeeCustomerId);
    const hasActiveSubscription = Boolean(activeSub);

    return NextResponse.json({
      isAuthenticated: true,
      hasOrg: true,
      hasChargebeeCustomer,
      hasActiveSubscription,
      organizationId: ctx.organizationId,
      chargebeeCustomerId: org?.chargebeeCustomerId ?? null,
      subscriptionStatus: activeSub?.status ?? null,
      checkout: checkoutRedirectInfo(),
      journey: computeJourneyStatus({
        isAuthenticated: true,
        hasOrg: true,
        hasChargebeeCustomer,
        hasActiveSubscription,
      }),
    });
  } catch (error) {
    if (error instanceof SessionError && error.status === 403) {
      return NextResponse.json({
        isAuthenticated: true,
        hasOrg: false,
        hasChargebeeCustomer: false,
        hasActiveSubscription: false,
        checkout: checkoutRedirectInfo(),
        journey: computeJourneyStatus({
          isAuthenticated: true,
          hasOrg: false,
          hasChargebeeCustomer: false,
          hasActiveSubscription: false,
        }),
      });
    }

    if (error instanceof SessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error('[api/demo/status]', error);
    return NextResponse.json({ error: 'Failed to load demo status' }, { status: 500 });
  }
}