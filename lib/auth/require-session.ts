import * as jose from 'jose';
import {
  getSession,
  isTokenExpired,
  setSession,
  type SessionData,
} from '@/lib/cookies';
import { getScalekitClient } from '@/lib/scalekit';

export class SessionError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export type AuthContext = {
  userId: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
};

type TokenClaims = {
  sub?: string;
  oid?: string;
  roles?: string[];
  permissions?: string[];
  'https://scalekit.com/permissions'?: string[];
  'scalekit:permissions'?: string[];
};

function extractPermissions(claims: TokenClaims): string[] {
  return (
    claims.permissions ??
    claims['https://scalekit.com/permissions'] ??
    claims['scalekit:permissions'] ??
    []
  );
}

async function refreshSessionIfNeeded(session: SessionData): Promise<string> {
  const client = getScalekitClient();
  const refreshResponse = await client.refreshAccessToken(
    session.tokens.refresh_token
  );

  let expiresAt: Date;
  let expiresIn: number;

  try {
    const decoded = jose.decodeJwt(refreshResponse.accessToken);
    if (decoded.exp) {
      expiresAt = new Date(decoded.exp * 1000);
      expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    } else {
      expiresIn = 3600;
      expiresAt = new Date(Date.now() + expiresIn * 1000);
    }
  } catch {
    expiresIn = 3600;
    expiresAt = new Date(Date.now() + expiresIn * 1000);
  }

  await setSession({
    ...session,
    tokens: {
      ...session.tokens,
      access_token: refreshResponse.accessToken,
      refresh_token:
        refreshResponse.refreshToken || session.tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      expires_in: expiresIn,
    },
  });

  return refreshResponse.accessToken;
}

export async function requireSession(): Promise<AuthContext> {
  const session = getSession();
  if (!session) {
    throw new SessionError(401, 'Not authenticated');
  }

  let accessToken = session.tokens.access_token;

  if (isTokenExpired(session)) {
    if (!session.tokens.refresh_token) {
      throw new SessionError(401, 'Session expired. Please log in again.');
    }
    accessToken = await refreshSessionIfNeeded(session);
  }

  const client = getScalekitClient();
  const claims = await client.validateToken<TokenClaims>(accessToken);

  const organizationId = claims.oid;
  if (!organizationId) {
    throw new SessionError(
      403,
      'Organization context required for billing'
    );
  }

  const userId = claims.sub;
  if (!userId) {
    throw new SessionError(401, 'Invalid session token');
  }

  return {
    userId,
    email: session.user.email ?? '',
    organizationId,
    roles: claims.roles ?? session.roles ?? [],
    permissions: extractPermissions(claims).length
      ? extractPermissions(claims)
      : (session.permissions ?? []),
  };
}