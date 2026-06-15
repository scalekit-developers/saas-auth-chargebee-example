/**
 * API route to handle logout
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { getSession, clearSession } from '@/lib/cookies';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    
    // Get logout URL from Scalekit
    if (session?.tokens.id_token) {
      const client = getScalekitClient();
      const postLogoutRedirectUri = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const logoutUrl = client.getLogoutUrl({
        idTokenHint: session.tokens.id_token,
        postLogoutRedirectUri,
      });

      // Clear session
      await clearSession();

      return NextResponse.json({ logoutUrl });
    }

    // Clear session even if no token
    await clearSession();
    return NextResponse.json({ logoutUrl: '/' });
  } catch (error: any) {
    console.error('Logout error:', error);
    // Still clear session on error
    await clearSession();
    return NextResponse.json({ logoutUrl: '/' });
  }
}

