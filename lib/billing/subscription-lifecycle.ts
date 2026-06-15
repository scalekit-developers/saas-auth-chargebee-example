import type { Customer, Subscription as CbSubscription, WebhookEvent } from 'chargebee';
import {
  findOrganizationByChargebeeCustomerId,
  clearChargebeeCustomerId,
  deleteOrganization,
} from '@/lib/db/organizations';
import {
  createFutureSubscription,
  deleteSubscriptionItems,
  deleteSubscriptionsByReferenceId,
  findByChargebeeSubscriptionId,
  findFutureByReferenceId,
  findSubscriptionById,
  insertSubscriptionItems,
  updateSubscription,
  type SubscriptionItemInput,
} from '@/lib/db/subscriptions';
import type { Subscription } from '@/lib/db/schema';
import {
  onSubscriptionCancel,
  onSubscriptionComplete,
  onSubscriptionCreated,
  onSubscriptionDeleted,
  onSubscriptionUpdated,
  onTrialEnd,
  onTrialStart,
  type SubscriptionHookContext,
} from '@/lib/subscription-hooks';
import {
  extractSeats,
  isActiveOrTrialing,
  isPendingCancel,
  readMetaString,
  unixToDate,
} from './utils';

type WebhookContent = {
  subscription?: CbSubscription;
  customer?: Customer;
};

function getContent(event: WebhookEvent): WebhookContent {
  return (event.content ?? {}) as WebhookContent;
}

function mapSubscriptionItems(
  cbSub: CbSubscription
): SubscriptionItemInput[] {
  if (cbSub.subscription_items?.length) {
    return cbSub.subscription_items.map((item) => ({
      itemPriceId: item.item_price_id,
      itemType: item.item_type,
      quantity: item.quantity ?? 1,
      unitPrice: item.unit_price ?? null,
      amount: item.amount ?? null,
    }));
  }

  if (cbSub.plan_id) {
    return [
      {
        itemPriceId: cbSub.plan_id,
        itemType: 'plan',
        quantity: cbSub.plan_quantity ?? 1,
        unitPrice: cbSub.plan_unit_price ?? null,
        amount: cbSub.plan_amount ?? null,
      },
    ];
  }

  return [];
}

async function syncSubscriptionItems(
  localSubscriptionId: string,
  cbSub: CbSubscription
): Promise<void> {
  await deleteSubscriptionItems(localSubscriptionId);
  const items = mapSubscriptionItems(cbSub);
  if (items.length > 0) {
    await insertSubscriptionItems(localSubscriptionId, items);
  }
}

function toHookContext(
  local: Subscription,
  cbSub: CbSubscription
): SubscriptionHookContext {
  return {
    referenceId: local.referenceId,
    subscriptionId: local.id,
    chargebeeSubscriptionId: cbSub.id,
    status: cbSub.status,
  };
}

async function resolveReferenceId(
  cbSub: CbSubscription,
  customer?: Customer
): Promise<string | null> {
  const fromCustomer = readMetaString(
    customer?.meta_data as Record<string, unknown> | undefined,
    'organizationId'
  );
  if (fromCustomer) return fromCustomer;

  const fromSubscription = readMetaString(
    cbSub.meta_data as Record<string, unknown> | undefined,
    'organizationId'
  );
  if (fromSubscription) return fromSubscription;

  if (cbSub.customer_id) {
    const org = await findOrganizationByChargebeeCustomerId(cbSub.customer_id);
    if (org) return org.id;
  }

  return null;
}

/**
 * Lookup order for hosted-checkout completion:
 * 1. chargebee_subscription_id on local row
 * 2. subscription.meta_data.subscriptionId (local id from checkout)
 * 3. customer.meta_data.pendingSubscriptionId (pre-checkout future row)
 * 4. future row by reference_id (org id)
 */
async function resolveLocalSubscription(
  cbSub: CbSubscription,
  customer?: Customer
): Promise<Subscription | undefined> {
  const byChargebeeId = await findByChargebeeSubscriptionId(cbSub.id);
  if (byChargebeeId) return byChargebeeId;

  const localIdFromSubMeta = readMetaString(
    cbSub.meta_data as Record<string, unknown> | undefined,
    'subscriptionId'
  );
  if (localIdFromSubMeta) {
    const byLocalId = await findSubscriptionById(localIdFromSubMeta);
    if (byLocalId) return byLocalId;
  }

  const pendingId = readMetaString(
    customer?.meta_data as Record<string, unknown> | undefined,
    'pendingSubscriptionId'
  );
  if (pendingId) {
    const pending = await findSubscriptionById(pendingId);
    if (pending) return pending;
  }

  const referenceId = await resolveReferenceId(cbSub, customer);
  if (referenceId) {
    return findFutureByReferenceId(referenceId);
  }

  return undefined;
}

export async function syncLocalFromChargebeeSubscription(
  local: Subscription,
  cbSub: CbSubscription
): Promise<Subscription | undefined> {
  return applyChargebeeSubscription(local, cbSub);
}

async function applyChargebeeSubscription(
  local: Subscription,
  cbSub: CbSubscription
): Promise<Subscription | undefined> {
  const updated = await updateSubscription(local.id, {
    referenceId: local.referenceId,
    chargebeeCustomerId: cbSub.customer_id ?? local.chargebeeCustomerId,
    chargebeeSubscriptionId: cbSub.id,
    status: cbSub.status,
    periodStart: unixToDate(cbSub.current_term_start),
    periodEnd: unixToDate(cbSub.current_term_end),
    trialStart: unixToDate(cbSub.trial_start),
    trialEnd: unixToDate(cbSub.trial_end),
    canceledAt: unixToDate(cbSub.cancelled_at),
    seats: extractSeats(cbSub),
    metadata: JSON.stringify(cbSub.meta_data ?? null),
  });

  if (updated) {
    await syncSubscriptionItems(updated.id, cbSub);
  }

  return updated;
}

export async function onSubscriptionCreatedEvent(
  event: WebhookEvent
): Promise<void> {
  const { subscription: cbSub, customer } = getContent(event);
  if (!cbSub) {
    console.warn('[chargebee-webhook] subscription_created missing subscription');
    return;
  }

  const existing = await findByChargebeeSubscriptionId(cbSub.id);
  if (existing) {
    const updated = await applyChargebeeSubscription(existing, cbSub);
    if (updated) {
      await onSubscriptionCreated(toHookContext(updated, cbSub));
      if (cbSub.status === 'in_trial') {
        await onTrialStart(toHookContext(updated, cbSub));
      }
    }
    return;
  }

  const referenceId = await resolveReferenceId(cbSub, customer);
  if (!referenceId) {
    console.error(
      '[chargebee-webhook] Cannot resolve organization for subscription',
      cbSub.id
    );
    return;
  }

  const local = await createFutureSubscription({
    referenceId,
    chargebeeCustomerId: cbSub.customer_id,
  });

  const updated = await applyChargebeeSubscription(local, cbSub);
  if (!updated) return;

  await onSubscriptionCreated(toHookContext(updated, cbSub));
  if (cbSub.status === 'in_trial') {
    await onTrialStart(toHookContext(updated, cbSub));
  }
}

export async function onSubscriptionCompleteEvent(
  event: WebhookEvent
): Promise<void> {
  const { subscription: cbSub, customer } = getContent(event);
  if (!cbSub) {
    console.warn('[chargebee-webhook] complete event missing subscription');
    return;
  }

  const local = await resolveLocalSubscription(cbSub, customer);
  if (!local) {
    console.warn(
      '[chargebee-webhook] No local subscription for complete event',
      cbSub.id
    );
    return;
  }

  const updated = await applyChargebeeSubscription(local, cbSub);
  if (!updated) return;

  const ctx = toHookContext(updated, cbSub);
  await onSubscriptionComplete(ctx);
  if (cbSub.status === 'in_trial') {
    await onTrialStart(ctx);
  }
}

export async function onSubscriptionUpdatedEvent(
  event: WebhookEvent
): Promise<void> {
  const { subscription: cbSub } = getContent(event);
  if (!cbSub) {
    console.warn('[chargebee-webhook] update event missing subscription');
    return;
  }

  const local =
    (await findByChargebeeSubscriptionId(cbSub.id)) ??
    (await resolveLocalSubscription(cbSub, getContent(event).customer));

  if (!local) {
    console.warn(
      '[chargebee-webhook] No local subscription for update event',
      cbSub.id
    );
    return;
  }

  const previousStatus = local.status;
  const scheduledCancelDetected =
    isActiveOrTrialing(cbSub.status) &&
    !local.canceledAt &&
    isPendingCancel(cbSub);

  const updated = await applyChargebeeSubscription(local, cbSub);
  if (!updated) return;

  const ctx = toHookContext(updated, cbSub);
  await onSubscriptionUpdated(ctx);

  if (previousStatus === 'in_trial' && cbSub.status === 'active') {
    await onTrialEnd(ctx);
  }

  if (scheduledCancelDetected) {
    await onSubscriptionCancel(ctx);
  }
}

export async function onSubscriptionDeletedEvent(
  event: WebhookEvent
): Promise<void> {
  const { subscription: cbSub } = getContent(event);
  if (!cbSub) {
    console.warn('[chargebee-webhook] cancel event missing subscription');
    return;
  }

  const local = await findByChargebeeSubscriptionId(cbSub.id);
  if (!local) {
    console.warn(
      '[chargebee-webhook] No local subscription for cancel event',
      cbSub.id
    );
    return;
  }

  const updated = await applyChargebeeSubscription(local, {
    ...cbSub,
    status: 'cancelled',
  });
  if (!updated) return;

  await onSubscriptionDeleted(toHookContext(updated, cbSub));
}

export async function handleCustomerDeletionEvent(
  event: WebhookEvent
): Promise<void> {
  const { customer } = getContent(event);
  if (!customer?.id) {
    console.warn('[chargebee-webhook] customer_deleted missing customer');
    return;
  }

  const org = await findOrganizationByChargebeeCustomerId(customer.id);
  if (!org) {
    console.warn(
      '[chargebee-webhook] No local org for deleted customer',
      customer.id
    );
    return;
  }

  await deleteSubscriptionsByReferenceId(org.id);
  await clearChargebeeCustomerId(org.id);
  await deleteOrganization(org.id);
}