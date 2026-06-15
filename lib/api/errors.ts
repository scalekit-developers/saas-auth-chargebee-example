import { NextResponse } from 'next/server';
import { SessionError } from '@/lib/auth/require-session';
import {
  chargebeeErrorStatus,
  formatChargebeeUserMessage,
  isChargebeeApiError,
} from '@/lib/billing/chargebee-errors';

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof SessionError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (isChargebeeApiError(error)) {
    const status = chargebeeErrorStatus(error);
    console.error('[api] chargebee', error);
    return NextResponse.json(
      { error: formatChargebeeUserMessage(error), code: error.error_code ?? error.api_error_code },
      { status: status >= 500 ? 502 : status }
    );
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  console.error('[api]', error);
  return NextResponse.json({ error: message }, { status: 500 });
}