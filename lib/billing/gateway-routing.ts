import { getChargebeeClient } from '@/lib/chargebee';

/** Mirrors hosted checkout v4: payment_intents without an explicit gateway. */
export async function canAutoSelectPaymentGateway(input: {
  customerId: string;
  amountCents: number;
  currencyCode?: string;
}): Promise<boolean> {
  const chargebee = getChargebeeClient();
  try {
    await chargebee.paymentIntent.create({
      amount: input.amountCents,
      currency_code: input.currencyCode ?? 'USD',
      payment_method_type: 'card',
      customer_id: input.customerId,
    });
    return true;
  } catch (error) {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'error_code' in error &&
      typeof (error as { error_code?: string }).error_code === 'string'
        ? (error as { error_code: string }).error_code
        : undefined;
    const message =
      typeof error === 'object' &&
      error !== null &&
      'message' in error &&
      typeof (error as { message?: string }).message === 'string'
        ? (error as { message: string }).message
        : '';
    if (
      code === 'invalid_request' &&
      message.toLowerCase().includes('no applicable gateways')
    ) {
      return false;
    }
    throw error;
  }
}

export function getRequiredGatewayAccountId(): string {
  const gatewayAccountId = process.env.CHARGEBEE_GATEWAY_ACCOUNT_ID?.trim();
  if (!gatewayAccountId) {
    throw new Error(
      'CHARGEBEE_GATEWAY_ACCOUNT_ID is required for hosted checkout on this Chargebee site. ' +
        'Add your test gateway id (gw_...) from Settings → Payment Gateways, or enable Smart Routing ' +
        'so Chargebee can auto-select a gateway during checkout.'
    );
  }
  return gatewayAccountId;
}