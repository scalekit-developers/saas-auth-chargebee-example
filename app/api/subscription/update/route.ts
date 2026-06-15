import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import {
  absoluteUrl,
  buildSuccessRedirectUrl,
  validateCallbackUrl,
} from '@/lib/billing/checkout';
import { getOrCreateCustomerId } from '@/lib/billing/get-or-create-customer';
import { getHostedCheckoutCardOptions } from '@/lib/billing/hosted-checkout';
import { getPlanByItemPriceId } from '@/lib/billing/plans';
import { isActiveOrTrialing } from '@/lib/billing/utils';
import { getChargebeeClient } from '@/lib/chargebee';
import {
  findByChargebeeSubscriptionId,
  findSubscriptionsByReferenceId,
  updateSubscription,
} from '@/lib/db/subscriptions';
import type { Subscription } from '@/lib/db/schema';

export const runtime = 'nodejs';

type UpdateBody = {
  itemPriceId?: string | string[];
  successUrl?: string;
  cancelUrl?: string;
  referenceId?: string;
  subscriptionId?: string;
  seats?: number;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = (await request.json()) as UpdateBody;
    const referenceId = body.referenceId ?? ctx.organizationId;

    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'update',
    });
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const itemPriceIds = Array.isArray(body.itemPriceId)
      ? body.itemPriceId
      : body.itemPriceId
        ? [body.itemPriceId]
        : [];

    if (!itemPriceIds.length) {
      return NextResponse.json(
        { error: 'At least one item price ID is required' },
        { status: 400 }
      );
    }

    const primaryItemPriceId = itemPriceIds[0];
    if (!getPlanByItemPriceId(primaryItemPriceId)) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    let subscriptionToUpdate: Subscription | undefined;
    if (body.subscriptionId) {
      subscriptionToUpdate = await findByChargebeeSubscriptionId(
        body.subscriptionId
      );
      if (
        !subscriptionToUpdate ||
        subscriptionToUpdate.referenceId !== referenceId
      ) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 400 }
        );
      }
    }

    const subscriptions = subscriptionToUpdate
      ? [subscriptionToUpdate]
      : await findSubscriptionsByReferenceId(referenceId);

    const activeLocal = subscriptions.find((sub) =>
      isActiveOrTrialing(sub.status)
    );

    const customerId = await getOrCreateCustomerId({
      organizationId: referenceId,
      email: ctx.email,
    });

    const chargebee = getChargebeeClient();
    const chargebeeSubsList = await chargebee.subscription.list({
      customer_id: { is: customerId },
      limit: 100,
    });

    const activeChargebeeSubs =
      chargebeeSubsList.list
        ?.filter((item) => isActiveOrTrialing(item.subscription.status))
        .map((item) => item.subscription) ?? [];

    const activeChargebeeSub = activeChargebeeSubs.find((sub) => {
      if (subscriptionToUpdate?.chargebeeSubscriptionId) {
        return sub.id === subscriptionToUpdate.chargebeeSubscriptionId;
      }
      if (body.subscriptionId) {
        return sub.id === body.subscriptionId;
      }
      if (activeLocal?.chargebeeSubscriptionId) {
        return sub.id === activeLocal.chargebeeSubscriptionId;
      }
      return false;
    });

    if (!activeChargebeeSub) {
      return NextResponse.json(
        { error: 'No active subscription found to update' },
        { status: 400 }
      );
    }

    const seats = body.seats ?? 1;
    const currentItemPriceIds =
      activeChargebeeSub.subscription_items?.map(
        (item) => item.item_price_id
      ) ?? [];
    const isSameItems =
      itemPriceIds.length === currentItemPriceIds.length &&
      itemPriceIds.every((id) => currentItemPriceIds.includes(id));
    const isSameSeats = activeLocal?.seats === seats;
    const isSubscriptionStillValid =
      !activeLocal?.periodEnd || activeLocal.periodEnd > new Date();

    if (
      activeLocal?.status === 'active' &&
      isSameItems &&
      isSameSeats &&
      isSubscriptionStillValid
    ) {
      return NextResponse.json(
        { error: 'Already subscribed to this plan' },
        { status: 400 }
      );
    }

    let dbSubscription =
      (await findByChargebeeSubscriptionId(activeChargebeeSub.id)) ??
      activeLocal ??
      subscriptionToUpdate;

    if (!dbSubscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!dbSubscription.chargebeeSubscriptionId) {
      dbSubscription =
        (await updateSubscription(dbSubscription.id, {
          chargebeeSubscriptionId: activeChargebeeSub.id,
        })) ?? dbSubscription;
    }

    try {
      await chargebee.customer.update(customerId, {
        meta_data: {
          pendingSubscriptionId: dbSubscription.id,
          pendingReferenceId: referenceId,
          userId: ctx.userId,
          organizationId: referenceId,
        },
      });
    } catch (err) {
      console.warn('[subscription/update] Failed to update customer metadata', err);
    }

    const successUrl = validateCallbackUrl(
      body.successUrl ?? '/billing?success=1'
    );
    const cancelUrl = validateCallbackUrl(body.cancelUrl ?? '/billing');

    const result = await chargebee.hostedPage.checkoutExistingForItems({
      subscription: { id: activeChargebeeSub.id },
      subscription_items: itemPriceIds.map((id) => ({
        item_price_id: id,
        quantity: seats,
      })),
      ...getHostedCheckoutCardOptions(),
      redirect_url: buildSuccessRedirectUrl(successUrl, dbSubscription.id),
      cancel_url: absoluteUrl(cancelUrl),
    });

    return NextResponse.json({
      url: result.hosted_page.url ?? '',
      id: result.hosted_page.id ?? '',
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('callbackURL')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}