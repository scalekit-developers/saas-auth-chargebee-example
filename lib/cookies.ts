/**
 * Cookie utilities for session management
 */
import { cookies } from 'next/headers';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

const SESSION_COOKIE_NAME = 'scalekit_session';
const STATE_COOKIE_NAME = 'oauth_state';

export interface SessionData {
  user: {
    sub?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    preferred_username?: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    id_token: string;
    expires_at: string;
    expires_in: number;
  };
  roles?: string[];
  permissions?: string[];
}

/**
 * Check if token is expired or expiring soon
 */
export function isTokenExpired(session: SessionData | null): boolean {
  if (!session) return true;

  const expiresAt = new Date(session.tokens.expires_at);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds

  return now.getTime() + bufferTime >= expiresAt.getTime();
}

/**
 * Get session data from cookies
 */
export function getSession(cookieStore?: ReadonlyRequestCookies): SessionData | null {
  const cookie = cookieStore || cookies();
  const sessionCookie = cookie.get(SESSION_COOKIE_NAME);
  
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(sessionCookie.value) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Set session data in cookies
 */
export async function setSession(sessionData: SessionData): Promise<void> {
  const cookieStore = cookies();
  const expiresAt = new Date(sessionData.tokens.expires_at);
  
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Clear session (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get OAuth state from cookies
 */
export function getOAuthState(cookieStore?: ReadonlyRequestCookies): string | null {
  const cookie = cookieStore || cookies();
  const stateCookie = cookie.get(STATE_COOKIE_NAME);
  return stateCookie?.value || null;
}

/**
 * Set OAuth state in cookies
 */
export async function setOAuthState(state: string): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });
}

/**
 * Clear OAuth state
 */
export async function clearOAuthState(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(STATE_COOKIE_NAME);
}

