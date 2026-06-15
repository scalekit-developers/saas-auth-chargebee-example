/**
 * API route to handle logout
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { getSession, clearSession } from '@/lib/cookies';

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    
    if (session?.tokens.id_token) {
      const client = getScalekitClient();
      const postLogoutRedirectUri =
        process.env.SCALEKIT_POST_LOGOUT_REDIRECT_URI?.trim();
      const logoutUrl = client.getLogoutUrl({
        idTokenHint: session.tokens.id_token,
        ...(postLogoutRedirectUri ? { postLogoutRedirectUri } : {}),
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

