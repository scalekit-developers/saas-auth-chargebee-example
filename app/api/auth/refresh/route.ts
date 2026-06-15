/**
 * API route to refresh access token
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { getSession, setSession } from '@/lib/cookies';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    
    if (!session?.tokens.refresh_token) {
      return NextResponse.json(
        { success: false, error: 'No refresh token available. Please log in again.' },
        { status: 400 }
      );
    }

    const client = getScalekitClient();
    const refreshResponse = await client.refreshAccessToken(session.tokens.refresh_token);

    // Decode the access token to get the expiration time
    let expiresAt: Date;
    let expiresIn: number;
    
    try {
      const decoded = jose.decodeJwt(refreshResponse.accessToken);
      if (decoded.exp) {
        // exp is in seconds since epoch
        expiresAt = new Date(decoded.exp * 1000);
        const now = new Date();
        expiresIn = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      } else {
        // Fallback: if no exp claim, default to 1 hour
        expiresIn = 3600;
        expiresAt = new Date(Date.now() + expiresIn * 1000);
      }
    } catch (error) {
      // If decoding fails, default to 1 hour
      console.warn('Failed to decode access token, using default expiration:', error);
      expiresIn = 3600;
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    // Update session with new tokens
    await setSession({
      ...session,
      tokens: {
        ...session.tokens,
        access_token: refreshResponse.accessToken,
        refresh_token: refreshResponse.refreshToken || session.tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        expires_in: expiresIn,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tokens refreshed successfully',
    });
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Token refresh failed' },
      { status: 500 }
    );
  }
}

