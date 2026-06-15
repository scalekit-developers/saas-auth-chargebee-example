import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import { absoluteUrl, validateCallbackUrl } from '@/lib/billing/checkout';
import { getOrCreateCustomerId } from '@/lib/billing/get-or-create-customer';
import { isActiveOrTrialing } from '@/lib/billing/utils';
import { getChargebeeClient } from '@/lib/chargebee';
import { getOrganizationById } from '@/lib/db/organizations';
import { findSubscriptionsByReferenceId } from '@/lib/db/subscriptions';

export const runtime = 'nodejs';

type PortalBody = {
  referenceId?: string;
  returnUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = (await request.json()) as PortalBody;
    const referenceId = body.referenceId ?? ctx.organizationId;

    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'portal',
    });
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscriptions = await findSubscriptionsByReferenceId(referenceId);
    const activeSub = subscriptions.find((sub) =>
      isActiveOrTrialing(sub.status)
    );

    let customerId = activeSub?.chargebeeCustomerId ?? null;
    if (!customerId) {
      const org = await getOrganizationById(referenceId);
      customerId = org?.chargebeeCustomerId ?? null;
    }

    if (!customerId) {
      customerId = await getOrCreateCustomerId({
        organizationId: referenceId,
        email: ctx.email,
        displayName: (await getOrganizationById(referenceId))?.displayName,
      });
    }

    const returnUrl = validateCallbackUrl(body.returnUrl ?? '/billing');
    const chargebee = getChargebeeClient();
    const portalSession = await chargebee.portalSession.create({
      customer: { id: customerId },
      redirect_url: absoluteUrl(returnUrl),
    });

    return NextResponse.json({
      url: portalSession.portal_session.access_url,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('callbackURL')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}