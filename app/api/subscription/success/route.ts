import { NextRequest, NextResponse } from 'next/server';
import { validateCallbackUrl } from '@/lib/billing/checkout';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const callbackURL = request.nextUrl.searchParams.get('callbackURL') ?? '/billing?success=1';

  try {
    const safePath = validateCallbackUrl(callbackURL);
    return NextResponse.redirect(new URL(safePath, request.url));
  } catch {
    return NextResponse.redirect(new URL('/billing?success=1', request.url));
  }
}