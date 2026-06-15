/**
 * API route to initiate login - generates authorization URL
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient, getDefaultScopes } from '@/lib/scalekit';
import { setOAuthState } from '@/lib/cookies';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const client = getScalekitClient();
    const redirectUri = process.env.SCALEKIT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('base64url');
    await setOAuthState(state);

    // Generate authorization URL
    const authUrl = client.getAuthorizationUrl(redirectUri, {
      state,
      scopes: getDefaultScopes(),
    });

    return NextResponse.json({ authUrl });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate login URL' },
      { status: 500 }
    );
  }
}

