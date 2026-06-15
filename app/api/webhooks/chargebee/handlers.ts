import type { WebhookEvent } from 'chargebee';
import { processChargebeeWebhookEvent } from '@/lib/billing/chargebee-webhook-handler';

export async function dispatchChargebeeEvent(
  event: WebhookEvent
): Promise<void> {
  await processChargebeeWebhookEvent(event);
}