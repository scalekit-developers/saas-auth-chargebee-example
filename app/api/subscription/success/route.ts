import { NextRequest, NextResponse } from 'next/server';
import { validateCallbackUrl } from '@/lib/billing/checkout';
import { getChargebeeClient } from '@/lib/chargebee';
import { findSubscriptionById } from '@/lib/db/subscriptions';
import { syncLocalFromChargebeeSubscription } from '@/lib/billing/subscription-lifecycle';

export const runtime = 'nodejs';

async function syncCheckoutResult(subscriptionId: string | null): Promise<void> {
  if (!subscriptionId) return;

  const local = await findSubscriptionById(subscriptionId);
  if (!local?.chargebeeCustomerId) return;

  const chargebee = getChargebeeClient();

  if (local.chargebeeSubscriptionId) {
    const result = await chargebee.subscription.retrieve(
      local.chargebeeSubscriptionId
    );
    await syncLocalFromChargebeeSubscription(local, result.subscription);
    return;
  }

  const result = await chargebee.subscription.subscriptionsForCustomer(
    local.chargebeeCustomerId,
    { limit: 10 }
  );
  const latest = result.list
    .map((entry) => entry.subscription)
    .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0];

  if (latest) {
    await syncLocalFromChargebeeSubscription(local, latest);
  }
}

export async function GET(request: NextRequest) {
  const callbackURL = request.nextUrl.searchParams.get('callbackURL') ?? '/billing?success=1';
  const subscriptionId = request.nextUrl.searchParams.get('subscriptionId');

  try {
    await syncCheckoutResult(subscriptionId);
    const safePath = validateCallbackUrl(callbackURL);
    return NextResponse.redirect(new URL(safePath, request.url));
  } catch (error) {
    console.warn('[subscription/success] Failed to sync checkout result', error);
    return NextResponse.redirect(new URL('/billing?success=1', request.url));
  }
}