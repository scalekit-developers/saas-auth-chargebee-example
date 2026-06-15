/**
 * Scalekit client initialization and utilities
 */
import { ScalekitClient } from '@scalekit-sdk/node';

let scalekitClient: ScalekitClient | null = null;

/**
 * Get or create the Scalekit client instance
 */
export function getScalekitClient(): ScalekitClient {
  if (!scalekitClient) {
    const envUrl = process.env.SCALEKIT_ENV_URL;
    const clientId = process.env.SCALEKIT_CLIENT_ID;
    const clientSecret = process.env.SCALEKIT_CLIENT_SECRET;

    if (!envUrl || !clientId || !clientSecret) {
      throw new Error(
        'Missing Scalekit configuration. Please set SCALEKIT_ENV_URL, SCALEKIT_CLIENT_ID, and SCALEKIT_CLIENT_SECRET environment variables.'
      );
    }

    scalekitClient = new ScalekitClient(envUrl, clientId, clientSecret);
  }

  return scalekitClient;
}

/**
 * Get default OAuth scopes
 */
export function getDefaultScopes(): string[] {
  const scopes = process.env.SCALEKIT_SCOPES;
  return scopes ? scopes.split(' ') : ['openid', 'profile', 'email', 'offline_access'];
}

