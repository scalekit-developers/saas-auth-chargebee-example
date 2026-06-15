export type HostedCheckoutCardOptions = {
  card?: { gateway_account_id: string };
};

/** Pin hosted checkout to a specific gateway when Chargebee cannot auto-select one. */
export function getHostedCheckoutCardOptions(): HostedCheckoutCardOptions {
  const gatewayAccountId = process.env.CHARGEBEE_GATEWAY_ACCOUNT_ID?.trim();
  if (!gatewayAccountId) {
    return {};
  }
  return { card: { gateway_account_id: gatewayAccountId } };
}

export function getPublicChargebeeSite(): string {
  const site = process.env.NEXT_PUBLIC_CHARGEBEE_SITE ?? process.env.CHARGEBEE_SITE;
  if (!site) {
    throw new Error('CHARGEBEE_SITE is not configured');
  }
  return site;
}

/** Client-safe key for Chargebee.js Payment Components (from Chargebee → API keys). */
export function getPublicChargebeePublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY ??
    process.env.CHARGEBEE_PUBLISHABLE_KEY;
  if (!key?.trim()) {
    throw new Error('CHARGEBEE_PUBLISHABLE_KEY is not configured');
  }
  return key.trim();
}