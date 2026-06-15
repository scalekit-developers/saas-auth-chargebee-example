import { NextRequest, NextResponse } from 'next/server';
import {
  WebhookAuthenticationError,
  basicAuthValidator,
  type WebhookEvent,
} from 'chargebee';
import { dispatchChargebeeEvent } from './handlers';

export const runtime = 'nodejs';

function headersToRecord(
  req: NextRequest
): Record<string, string | string[] | undefined> {
  const record: Record<string, string | string[] | undefined> = {};
  req.headers.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  return record;
}

function getBasicAuthValidator() {
  const username = process.env.CHARGEBEE_WEBHOOK_USERNAME;
  const password = process.env.CHARGEBEE_WEBHOOK_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return basicAuthValidator(
    (user, pass) => user === username && pass === password
  );
}

export async function POST(req: NextRequest) {
  const validator = getBasicAuthValidator();
  const headers = headersToRecord(req);

  if (validator) {
    try {
      await validator(headers);
    } catch (err) {
      if (err instanceof WebhookAuthenticationError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      console.error('[chargebee-webhook] Auth validation failed', err);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    console.warn(
      '[chargebee-webhook] CHARGEBEE_WEBHOOK_USERNAME/PASSWORD not set — skipping Basic Auth'
    );
  }

  let event: WebhookEvent;
  const rawBody = await req.text();

  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[chargebee-webhook] Parse error', message);
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  if (!event?.event_type || !event.id) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  try {
    await dispatchChargebeeEvent(event);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error('[chargebee-webhook] Handler failed', err);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}