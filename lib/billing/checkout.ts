export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_APP_URL is not configured');
  }
  return url.replace(/\/$/, '');
}

/** Only allow same-origin relative paths (open-redirect prevention). */
export function isRelativeCallbackUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

export function validateCallbackUrl(url: string | null | undefined): string {
  if (!url || !isRelativeCallbackUrl(url)) {
    throw new Error('callbackURL must be a relative path starting with /');
  }
  return url;
}

export function buildSuccessRedirectUrl(
  callbackURL: string,
  subscriptionId: string
): string {
  const base = getAppUrl();
  const params = new URLSearchParams({
    callbackURL,
    subscriptionId,
  });
  return `${base}/api/subscription/success?${params.toString()}`;
}

export function buildCancelCallbackUrl(
  callbackURL: string,
  subscriptionId: string
): string {
  const base = getAppUrl();
  const params = new URLSearchParams({
    callbackURL,
    subscriptionId,
  });
  return `${base}/api/subscription/cancel/callback?${params.toString()}`;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${getAppUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}