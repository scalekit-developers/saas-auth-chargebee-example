import { NextRequest, NextResponse } from 'next/server';
import { authorizeReference } from '@/lib/auth/authorize-reference';
import { requireSession } from '@/lib/auth/require-session';
import { handleRouteError } from '@/lib/api/errors';
import { validateCallbackUrl } from '@/lib/billing/checkout';
import { getOrCreateCustomerId } from '@/lib/billing/get-or-create-customer';
import { getChargebeeClient } from '@/lib/chargebee';

export const runtime = 'nodejs';

type CompleteBody = {
  hostedPageId?: string;
  paymentIntentId?: string;
  referenceId?: string;
  successUrl?: string;
};

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireSession();
    const body = (await request.json()) as CompleteBody;

    const hostedPageId = body.hostedPageId?.trim();
    const paymentIntentId = body.paymentIntentId?.trim();
    if (!hostedPageId || !paymentIntentId) {
      return NextResponse.json(
        { error: 'hostedPageId and paymentIntentId are required' },
        { status: 400 }
      );
    }

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

    const customerId = await getOrCreateCustomerId({
      organizationId: referenceId,
      email: ctx.email,
    });

    const chargebee = getChargebeeClient();

    const paymentIntent = await chargebee.paymentIntent.retrieve(paymentIntentId);
    const pi = paymentIntent.payment_intent;
    if (pi.customer_id && pi.customer_id !== customerId) {
      return NextResponse.json({ error: 'Payment intent customer mismatch' }, { status: 403 });
    }

    const status = pi.status;
    if (status !== 'authorized' && status !== 'consumed') {
      return NextResponse.json(
        {
          error:
            'Payment is not authorized yet. Complete card entry and try again.',
          status,
        },
        { status: 400 }
      );
    }

    const hostedPage = await chargebee.hostedPage.retrieve(hostedPageId);
    if (hostedPage.hosted_page.state === 'succeeded') {
      const successUrl = validateCallbackUrl(body.successUrl ?? '/billing?success=1');
      return NextResponse.json({ redirectUrl: successUrl });
    }

    await chargebee.hostedPage.acknowledge(hostedPageId);

    const successUrl = validateCallbackUrl(body.successUrl ?? '/billing?success=1');
    return NextResponse.json({ redirectUrl: successUrl });
  } catch (error) {
    if (error instanceof Error && error.message.includes('callbackURL')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleRouteError(error);
  }
}