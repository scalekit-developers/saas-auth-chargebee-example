import { getRequiredGatewayAccountId } from '@/lib/billing/gateway-routing';
import { getChargebeeClient } from '@/lib/chargebee';

/** Trial checkouts verify the card with a $1 auth (100 cents), matching hosted checkout v4. */
export function getCheckoutVerificationAmountCents(input: {
  trialEnd?: number;
  planAmountCents: number;
}): number {
  if (input.trialEnd) {
    return 100;
  }
  return input.planAmountCents;
}

export async function createCheckoutPaymentIntent(input: {
  customerId: string;
  amountCents: number;
  currencyCode?: string;
}): Promise<string> {
  const chargebee = getChargebeeClient();
  const result = await chargebee.paymentIntent.create({
    amount: input.amountCents,
    currency_code: input.currencyCode ?? 'USD',
    payment_method_type: 'card',
    customer_id: input.customerId,
    gateway_account_id: getRequiredGatewayAccountId(),
  });
  const id = result.payment_intent.id;
  if (!id) {
    throw new Error('Chargebee did not return a payment intent id');
  }
  return id;
}