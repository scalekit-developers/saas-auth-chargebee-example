import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/billing', '/sessions', '/organization'];

export function middleware(request: NextRequest) {
  const session = request.cookies.get('scalekit_session');
  const isProtected = PROTECTED_PATHS.some(
    (p) =>
      request.nextUrl.pathname === p ||
      request.nextUrl.pathname.startsWith(`${p}/`)
  );

  if (isProtected && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon).*)'],
};