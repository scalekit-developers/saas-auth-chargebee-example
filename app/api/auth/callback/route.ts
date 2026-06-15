/**
 * API route to handle OAuth callback
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { getOAuthState, clearOAuthState, setSession } from '@/lib/cookies';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle errors
  if (error) {
    return NextResponse.redirect(
      new URL(`/error?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    );
  }

  // Verify state
  const storedState = getOAuthState();
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      new URL('/error?error=' + encodeURIComponent('Invalid state parameter. Please try logging in again.'), request.url)
    );
  }

  // Clear state
  await clearOAuthState();

  if (!code) {
    return NextResponse.redirect(
      new URL('/error?error=' + encodeURIComponent('No authorization code received.'), request.url)
    );
  }

  try {
    const client = getScalekitClient();
    const redirectUri = process.env.SCALEKIT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;

    // Exchange code for tokens
    const authResponse = await client.authenticateWithCode(code, redirectUri);

    // Get user info from access token
    const claims = await client.validateToken<{
      sub?: string;
      email?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      preferred_username?: string;
      roles?: string[];
      permissions?: string[];
      'https://scalekit.com/roles'?: string[];
      'https://scalekit.com/permissions'?: string[];
    }>(authResponse.accessToken);

    // Calculate expiration time
    const expiresIn = authResponse.expiresIn || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Construct name from available fields
    // Try: user.name -> claims.name -> givenName + familyName -> given_name + family_name -> email -> preferred_username
    let name = authResponse.user.name || claims.name;
    if (!name) {
      const givenName = authResponse.user.givenName || claims.given_name;
      const familyName = authResponse.user.familyName || claims.family_name;
      if (givenName && familyName) {
        name = `${givenName} ${familyName}`.trim();
      } else if (givenName) {
        name = givenName;
      } else if (familyName) {
        name = familyName;
      }
    }
    // Fallback to email or username if name is still not available
    if (!name) {
      name = authResponse.user.email || claims.email || authResponse.user.username || claims.preferred_username || 'User';
    }

    // Store session
    await setSession({
      user: {
        sub: authResponse.user.id || claims.sub,
        email: authResponse.user.email || claims.email,
        name: name,
        given_name: authResponse.user.givenName || claims.given_name,
        family_name: authResponse.user.familyName || claims.family_name,
        preferred_username: authResponse.user.username || claims.preferred_username,
      },
      tokens: {
        access_token: authResponse.accessToken,
        refresh_token: authResponse.refreshToken,
        id_token: authResponse.idToken,
        expires_at: expiresAt.toISOString(),
        expires_in: expiresIn,
      },
      roles: claims.roles || claims['https://scalekit.com/roles'] || [],
      permissions: claims.permissions || claims['https://scalekit.com/permissions'] || [],
    });

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL(`/error?error=${encodeURIComponent(error.message || 'Authentication failed')}`, request.url)
    );
  }
}

