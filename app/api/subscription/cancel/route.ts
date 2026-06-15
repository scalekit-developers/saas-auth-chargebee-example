import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import {
  absoluteUrl,
  buildCancelCallbackUrl,
  validateCallbackUrl,
} from '@/lib/billing/checkout';
import { isActiveOrTrialing } from '@/lib/billing/utils';
import { getChargebeeClient } from '@/lib/chargebee';
import {
  deleteSubscriptionsByReferenceId,
  findByChargebeeSubscriptionId,
  findSubscriptionsByReferenceId,
  updateSubscription,
} from '@/lib/db/subscriptions';
import { onSubscriptionCancel } from '@/lib/subscription-hooks';

export const runtime = 'nodejs';

type CancelBody = {
  referenceId?: string;
  subscriptionId?: string;
  returnUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = (await request.json()) as CancelBody;
    const referenceId = body.referenceId ?? ctx.organizationId;

    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'cancel',
    });
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let subscription = body.subscriptionId
      ? await findByChargebeeSubscriptionId(body.subscriptionId)
      : undefined;

    if (
      body.subscriptionId &&
      subscription &&
      subscription.referenceId !== referenceId
    ) {
      subscription = undefined;
    }

    if (!subscription) {
      const subs = await findSubscriptionsByReferenceId(referenceId);
      subscription = subs.find((sub) => isActiveOrTrialing(sub.status));
    }

    if (!subscription?.chargebeeCustomerId) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 400 }
      );
    }

    const chargebee = getChargebeeClient();
    const chargebeeSubsList = await chargebee.subscription.list({
      customer_id: { is: subscription.chargebeeCustomerId },
      limit: 100,
    });

    const activeSubscriptions =
      chargebeeSubsList.list
        ?.filter((item) => isActiveOrTrialing(item.subscription.status))
        .map((item) => item.subscription) ?? [];

    if (!activeSubscriptions.length) {
      await deleteSubscriptionsByReferenceId(referenceId);
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 400 }
      );
    }

    const activeChargebeeSub = activeSubscriptions.find(
      (sub) => sub.id === subscription!.chargebeeSubscriptionId
    );

    if (!activeChargebeeSub) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 400 }
      );
    }

    const returnUrl = validateCallbackUrl(body.returnUrl ?? '/billing');

    try {
      const portalSession = await chargebee.portalSession.create({
        customer: { id: subscription.chargebeeCustomerId },
        redirect_url: absoluteUrl(
          buildCancelCallbackUrl(returnUrl, subscription.id)
        ),
      });

      return NextResponse.json({
        url: portalSession.portal_session.access_url,
      });
    } catch (err) {
      const error = err as { message?: string; api_error_code?: string };
      if (
        error.message?.includes('already') ||
        error.message?.includes('cancel')
      ) {
        if (!subscription.canceledAt) {
          try {
            const chargebeeSubResult = await chargebee.subscription.retrieve(
              activeChargebeeSub.id
            );
            const chargebeeSub = chargebeeSubResult.subscription;
            const updated = await updateSubscription(subscription.id, {
              canceledAt: chargebeeSub.cancelled_at
                ? new Date(chargebeeSub.cancelled_at * 1000)
                : new Date(),
            });
            if (updated && chargebeeSub.id) {
              await onSubscriptionCancel({
                referenceId: updated.referenceId,
                subscriptionId: updated.id,
                chargebeeSubscriptionId: chargebeeSub.id,
                status: chargebeeSub.status,
              });
            }
          } catch (retrieveError) {
            console.error(
              '[subscription/cancel] Error retrieving subscription',
              retrieveError
            );
          }
        }
      }

      return NextResponse.json(
        { error: error.message ?? 'Failed to open cancellation portal' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('callbackURL')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}