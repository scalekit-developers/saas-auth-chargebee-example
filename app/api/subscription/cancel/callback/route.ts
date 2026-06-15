import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/cookies';
import { validateCallbackUrl } from '@/lib/billing/checkout';

import { getChargebeeClient } from '@/lib/chargebee';
import { findSubscriptionById, updateSubscription } from '@/lib/db/subscriptions';
import { onSubscriptionCancel } from '@/lib/subscription-hooks';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const callbackURL =
    request.nextUrl.searchParams.get('callbackURL') ?? '/billing';
  const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');

  let redirectPath = '/billing';
  try {
    redirectPath = validateCallbackUrl(callbackURL);
  } catch {
    redirectPath = '/billing';
  }

  if (!subscriptionId) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const session = getSession();
  if (!session) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  try {
    const subscription = await findSubscriptionById(subscriptionId);
    if (!subscription || subscription.status === 'cancelled') {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (subscription.chargebeeSubscriptionId) {
      const chargebee = getChargebeeClient();
      const chargebeeSubResult = await chargebee.subscription.retrieve(
        subscription.chargebeeSubscriptionId
      );
      const chargebeeSub = chargebeeSubResult.subscription;

      const isCancelled =
        chargebeeSub.status === 'cancelled' || Boolean(chargebeeSub.cancelled_at);

      if (isCancelled && !subscription.canceledAt) {
        const updated = await updateSubscription(subscription.id, {
          status: chargebeeSub.status,
          canceledAt: chargebeeSub.cancelled_at
            ? new Date(chargebeeSub.cancelled_at * 1000)
            : new Date(),
        });

        if (updated) {
          await onSubscriptionCancel({
            referenceId: updated.referenceId,
            subscriptionId: updated.id,
            chargebeeSubscriptionId: chargebeeSub.id,
            status: chargebeeSub.status,
          });
        }
      }
    }
  } catch (error) {
    console.error('[subscription/cancel/callback]', error);
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}