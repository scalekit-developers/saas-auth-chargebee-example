import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { dispatchScalekitEvent } from './handlers';

export const runtime = 'nodejs';

function headersToRecord(req: NextRequest): Record<string, string> {
  const record: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const secret = process.env.SCALEKIT_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const client = getScalekitClient();

  try {
    const isValid = client.verifyWebhookPayload(
      secret,
      headersToRecord(req),
      rawBody
    );

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch (err) {
    console.error('[scalekit-webhook] Signature verification failed', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  setImmediate(() => {
    dispatchScalekitEvent(event).catch((err) => {
      console.error('[scalekit-webhook] Async handler failed', err);
    });
  });

  return NextResponse.json({ received: true }, { status: 200 });
}