import {
  WebhookEventType,
  basicAuthValidator,
  type WebhookEvent,
  type WebhookHandler,
} from 'chargebee';
import { getChargebeeClient } from '@/lib/chargebee';
import {
  handleCustomerDeletionEvent,
  onSubscriptionCompleteEvent,
  onSubscriptionCreatedEvent,
  onSubscriptionDeletedEvent,
  onSubscriptionUpdatedEvent,
} from './subscription-lifecycle';

let webhookHandler: WebhookHandler | null = null;

export function getChargebeeWebhookRequestValidator() {
  const username = process.env.CHARGEBEE_WEBHOOK_USERNAME;
  const password = process.env.CHARGEBEE_WEBHOOK_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'Missing CHARGEBEE_WEBHOOK_USERNAME or CHARGEBEE_WEBHOOK_PASSWORD'
    );
  }

  return basicAuthValidator(
    (user, pass) => user === username && pass === password
  );
}

function registerLifecycleHandlers(handler: WebhookHandler): void {
  const complete = async ({ event }: { event: WebhookEvent }) => {
    await onSubscriptionCompleteEvent(event);
  };

  handler.on(WebhookEventType.SubscriptionCreated, async ({ event }) => {
    await onSubscriptionCreatedEvent(event);
  });

  handler.on(WebhookEventType.SubscriptionActivated, complete);
  handler.on(WebhookEventType.SubscriptionStarted, complete);

  handler.on(WebhookEventType.SubscriptionChanged, async ({ event }) => {
    await onSubscriptionUpdatedEvent(event);
  });
  handler.on(WebhookEventType.SubscriptionRenewed, async ({ event }) => {
    await onSubscriptionUpdatedEvent(event);
  });
  handler.on(
    WebhookEventType.SubscriptionScheduledCancellationRemoved,
    async ({ event }) => {
      await onSubscriptionUpdatedEvent(event);
    }
  );

  handler.on(WebhookEventType.SubscriptionCancelled, async ({ event }) => {
    await onSubscriptionDeletedEvent(event);
  });

  handler.on(WebhookEventType.CustomerDeleted, async ({ event }) => {
    await handleCustomerDeletionEvent(event);
  });

  handler.on('unhandled_event', ({ event }) => {
    console.warn(
      `[chargebee-webhook] Unhandled event type: ${event.event_type}`
    );
  });
}

export function createChargebeeWebhookHandler(): WebhookHandler {
  const chargebee = getChargebeeClient();
  const handler = chargebee.webhooks.createHandler();
  handler.requestValidator = getChargebeeWebhookRequestValidator();
  registerLifecycleHandlers(handler);
  return handler;
}

export function getChargebeeWebhookHandler(): WebhookHandler {
  if (!webhookHandler) {
    webhookHandler = createChargebeeWebhookHandler();
  }
  return webhookHandler;
}

export async function processChargebeeWebhookEvent(
  event: WebhookEvent
): Promise<void> {
  switch (event.event_type) {
    case WebhookEventType.SubscriptionCreated:
      await onSubscriptionCreatedEvent(event);
      break;
    case WebhookEventType.SubscriptionActivated:
    case WebhookEventType.SubscriptionStarted:
      await onSubscriptionCompleteEvent(event);
      break;
    case WebhookEventType.SubscriptionChanged:
    case WebhookEventType.SubscriptionRenewed:
    case WebhookEventType.SubscriptionScheduledCancellationRemoved:
      await onSubscriptionUpdatedEvent(event);
      break;
    case WebhookEventType.SubscriptionCancelled:
      await onSubscriptionDeletedEvent(event);
      break;
    case WebhookEventType.CustomerDeleted:
      await handleCustomerDeletionEvent(event);
      break;
    default:
      console.warn(
        `[chargebee-webhook] Unhandled event type: ${event.event_type}`
      );
  }
}