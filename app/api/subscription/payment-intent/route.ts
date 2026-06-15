import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import { getOrCreateCustomerId } from '@/lib/billing/get-or-create-customer';
import { getChargebeeClient } from '@/lib/chargebee';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const paymentIntentId = request.nextUrl.searchParams
      .get('paymentIntentId')
      ?.trim();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'paymentIntentId is required' },
        { status: 400 }
      );
    }

    const referenceId =
      request.nextUrl.searchParams.get('referenceId') ?? ctx.organizationId;
    const authorized = await authorizeReference({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      referenceId,
      action: 'create',
    });
    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customerId = await getOrCreateCustomerId({
      organizationId: referenceId,
      email: ctx.email,
    });

    const chargebee = getChargebeeClient();
    const result = await chargebee.paymentIntent.retrieve(paymentIntentId);
    const paymentIntent = result.payment_intent;

    if (paymentIntent.customer_id && paymentIntent.customer_id !== customerId) {
      return NextResponse.json(
        { error: 'Payment intent customer mismatch' },
        { status: 403 }
      );
    }

    return NextResponse.json({ paymentIntent });
  } catch (error) {
    return handleRouteError(error);
  }
}