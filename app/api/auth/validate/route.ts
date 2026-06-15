/**
 * API route to validate access token
 */
import { NextRequest, NextResponse } from 'next/server';
import { getScalekitClient } from '@/lib/scalekit';
import { getSession } from '@/lib/cookies';

interface TokenClaims {
  sub: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const session = getSession();
    
    if (!session?.tokens.access_token) {
      return NextResponse.json(
        { valid: false, error: 'No access token found' },
        { status: 400 }
      );
    }

    const client = getScalekitClient();
    const claims = await client.validateToken(session.tokens.access_token) as {
      sub?: string;
      email?: string;
      name?: string;
    };

    return NextResponse.json({
      valid: true,
      claims,
      message: 'Token is valid',
      userId: claims.sub,
      email: claims.email,
      name: claims.name,
    });
  } catch (error: any) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { valid: false, error: error.message || 'Token validation failed' },
      { status: 500 }
    );
  }
}

