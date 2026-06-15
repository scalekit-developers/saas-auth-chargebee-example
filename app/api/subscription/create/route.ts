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
import {
  chargebeeErrorStatus,
  formatChargebeeUserMessage,
  getChargebeeErrorCode,
  isChargebeeApiError,
} from '@/lib/billing/chargebee-errors';
import { canAutoSelectPaymentGateway } from '@/lib/billing/gateway-routing';
import { getHostedCheckoutCardOptions } from '@/lib/billing/hosted-checkout';
import { getCheckoutVerificationAmountCents } from '@/lib/billing/payment-intent';
import { getPlanByItemPriceId } from '@/lib/billing/plans';
import { getChargebeeClient } from '@/lib/chargebee';
import {
  createFutureSubscription,
  findActiveByReferenceId,
  findSubscriptionsByReferenceId,
  updateSubscription,
} from '@/lib/db/subscriptions';
export const runtime = 'nodejs';

type CreateBody = {
  itemPriceId?: string | string[];
  successUrl?: string;
  cancelUrl?: string;
  referenceId?: string;
  seats?: number;
  trialEnd?: number;
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = (await request.json()) as CreateBody;

    const referenceId = body.referenceId ?? ctx.organizationId;
    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'create',
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
    const plan = getPlanByItemPriceId(primaryItemPriceId);
    if (!plan) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
    }

    const active = await findActiveByReferenceId(referenceId);
    if (active) {
      return NextResponse.json(
        { error: 'An active subscription already exists for this organization' },
        { status: 400 }
      );
    }

    const customerId = await getOrCreateCustomerId({
      organizationId: referenceId,
      email: ctx.email,
    });

    const existingSubs = await findSubscriptionsByReferenceId(referenceId);
    const seats = body.seats ?? 1;

    let localSub = existingSubs.find((sub) => sub.status === 'future');
    if (localSub) {
      await updateSubscription(localSub.id, { seats });
    } else {
      localSub = await createFutureSubscription({
        referenceId,
        chargebeeCustomerId: customerId,
      });
      await updateSubscription(localSub.id, { seats });
    }

    const chargebee = getChargebeeClient();

    try {
      await chargebee.customer.update(customerId, {
        preferred_currency_code: 'USD',
        meta_data: {
          pendingSubscriptionId: localSub.id,
          pendingReferenceId: referenceId,
          userId: ctx.userId,
          organizationId: referenceId,
        },
      });
    } catch (err) {
      console.warn('[subscription/create] Failed to update customer metadata', err);
    }

    let trialEnd = body.trialEnd;
    if (!trialEnd && plan.freeTrial?.days) {
      const hadTrial = existingSubs.some((sub) => sub.trialStart != null);
      if (!hadTrial) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + plan.freeTrial.days);
        trialEnd = Math.floor(trialEndDate.getTime() / 1000);
      }
    }

    const successUrl = validateCallbackUrl(
      body.successUrl ?? '/billing?success=1'
    );
    const cancelUrl = validateCallbackUrl(body.cancelUrl ?? '/billing');
    const successRedirect = buildSuccessRedirectUrl(successUrl, localSub.id);

    try {
      const itemPrice = await chargebee.itemPrice.retrieve(primaryItemPriceId);
      const planAmountCents = itemPrice.item_price.price ?? 0;
      const verificationAmountCents = getCheckoutVerificationAmountCents({
        trialEnd,
        planAmountCents,
      });

      const autoGateway = await canAutoSelectPaymentGateway({
        customerId,
        amountCents: verificationAmountCents,
        currencyCode: itemPrice.item_price.currency_code ?? 'USD',
      });

      const result = await chargebee.hostedPage.checkoutNewForItems({
        subscription_items: itemPriceIds.map((id) => ({
          item_price_id: id,
          quantity: seats,
        })),
        customer: { id: customerId },
        allow_offline_payment_methods: false,
        ...getHostedCheckoutCardOptions(),
        ...(trialEnd ? { subscription: { trial_end: trialEnd } } : {}),
        redirect_url: successRedirect,
        cancel_url: absoluteUrl(cancelUrl),
      });

      const hostedPageId = result.hosted_page.id ?? '';
      const hostedPageUrl = result.hosted_page.url ?? '';

      if (!autoGateway) {
        return NextResponse.json(
          {
            error:
              'Chargebee could not auto-select a payment gateway for hosted checkout. ' +
              'Enable Smart Routing in Chargebee, or enable Chargebee Payment Components for this site before using the embedded checkout fallback.',
            code: 'no_applicable_gateway',
            hostedPageUrl,
          },
          { status: 409 }
        );
      }

      return NextResponse.json({
        mode: 'hosted',
        url: hostedPageUrl,
        id: hostedPageId,
      });
    } catch (checkoutError) {
      if (isChargebeeApiError(checkoutError)) {
        const status = chargebeeErrorStatus(checkoutError);
        return NextResponse.json(
          {
            error: formatChargebeeUserMessage(checkoutError),
            code: getChargebeeErrorCode(checkoutError),
          },
          { status: status >= 500 ? 502 : status }
        );
      }
      throw checkoutError;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('callbackURL')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}