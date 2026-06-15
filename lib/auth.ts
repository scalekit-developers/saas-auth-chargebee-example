/**
 * Authentication utilities and helpers
 */
import { getSession } from './cookies';
import { getScalekitClient } from './scalekit';
import { cookies } from 'next/headers';

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = getSession();
  return session !== null;
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = getSession();
  return session?.user || null;
}

/**
 * Get access token from session
 */
export async function getAccessToken(): Promise<string | null> {
  const session = getSession();
  return session?.tokens.access_token || null;
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(permission: string): Promise<boolean> {
  const session = getSession();
  if (!session?.tokens.access_token) {
    return false;
  }

  try {
    const client = getScalekitClient();
    const claims = await client.validateToken<{
      permissions?: string[];
      'https://scalekit.com/permissions'?: string[];
      'scalekit:permissions'?: string[];
    }>(session.tokens.access_token);

    const permissions = 
      claims.permissions || 
      claims['https://scalekit.com/permissions'] || 
      claims['scalekit:permissions'] || 
      [];

    return permissions.includes(permission);
  } catch {
    return false;
  }
}

// isTokenExpired is now exported from cookies.ts

