import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import { getPlans } from '@/lib/billing/plans';
import { isActiveOrTrialing } from '@/lib/billing/utils';
import {
  findSubscriptionItems,
  findSubscriptionsByReferenceId,
} from '@/lib/db/subscriptions';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const referenceId =
      request.nextUrl.searchParams.get('referenceId') ?? ctx.organizationId;

    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'list',
    });
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subscriptions = await findSubscriptionsByReferenceId(referenceId);
    const activeSubs = subscriptions.filter((sub) =>
      isActiveOrTrialing(sub.status)
    );

    if (!activeSubs.length) {
      return NextResponse.json([]);
    }

    const plans = getPlans();
    const enriched = await Promise.all(
      activeSubs.map(async (sub) => {
        const items = await findSubscriptionItems(sub.id);
        const primaryItem =
          items.find((item) => item.itemType === 'plan') ?? items[0];
        const plan = primaryItem
          ? plans.find((p) => p.itemPriceId === primaryItem.itemPriceId)
          : undefined;

        return {
          ...sub,
          limits: plan?.limits,
          itemPriceId: primaryItem?.itemPriceId,
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (error) {
    return handleRouteError(error);
  }
}