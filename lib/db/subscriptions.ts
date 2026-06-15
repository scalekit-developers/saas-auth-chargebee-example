import { and, eq, inArray } from 'drizzle-orm';
import { db } from './index';
import {
  subscription,
  subscriptionItem,
  type Subscription,
  type SubscriptionItem,
} from './schema';

const ACTIVE_STATUSES = ['active', 'in_trial', 'non_renewing'] as const;

export type SubscriptionItemInput = {
  itemPriceId: string;
  itemType: string;
  quantity: number;
  unitPrice?: number | null;
  amount?: number | null;
};

export async function createFutureSubscription(input: {
  referenceId: string;
  chargebeeCustomerId?: string | null;
}): Promise<Subscription> {
  const id = crypto.randomUUID();
  await db.insert(subscription).values({
    id,
    referenceId: input.referenceId,
    chargebeeCustomerId: input.chargebeeCustomerId ?? null,
    status: 'future',
  });
  return (await findSubscriptionById(id))!;
}

export async function findSubscriptionById(
  id: string
): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.id, id))
    .limit(1);
  return rows[0];
}

export async function findByChargebeeSubscriptionId(
  chargebeeSubscriptionId: string
): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscription)
    .where(eq(subscription.chargebeeSubscriptionId, chargebeeSubscriptionId))
    .limit(1);
  return rows[0];
}

export async function findFutureByReferenceId(
  referenceId: string
): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, referenceId),
        eq(subscription.status, 'future')
      )
    )
    .limit(1);
  return rows[0];
}

export async function findActiveByReferenceId(
  referenceId: string
): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscription)
    .where(
      and(
        eq(subscription.referenceId, referenceId),
        inArray(subscription.status, [...ACTIVE_STATUSES])
      )
    )
    .limit(1);
  return rows[0];
}

export async function updateSubscription(
  id: string,
  patch: Partial<{
    referenceId: string;
    chargebeeCustomerId: string | null;
    chargebeeSubscriptionId: string | null;
    status: string;
    periodStart: Date | null;
    periodEnd: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    canceledAt: Date | null;
    seats: number | null;
    metadata: string | null;
  }>
): Promise<Subscription | undefined> {
  await db.update(subscription).set(patch).where(eq(subscription.id, id));
  return findSubscriptionById(id);
}

export async function deleteSubscriptionItems(
  subscriptionId: string
): Promise<void> {
  await db
    .delete(subscriptionItem)
    .where(eq(subscriptionItem.subscriptionId, subscriptionId));
}

export async function insertSubscriptionItems(
  subscriptionId: string,
  items: SubscriptionItemInput[]
): Promise<SubscriptionItem[]> {
  if (items.length === 0) return [];

  const rows = items.map((item) => ({
    id: crypto.randomUUID(),
    subscriptionId,
    itemPriceId: item.itemPriceId,
    itemType: item.itemType,
    quantity: item.quantity,
    unitPrice: item.unitPrice ?? null,
    amount: item.amount ?? null,
  }));

  await db.insert(subscriptionItem).values(rows);

  return db
    .select()
    .from(subscriptionItem)
    .where(eq(subscriptionItem.subscriptionId, subscriptionId));
}

export async function findSubscriptionsByReferenceId(
  referenceId: string
): Promise<Subscription[]> {
  return db
    .select()
    .from(subscription)
    .where(eq(subscription.referenceId, referenceId));
}

export async function findSubscriptionItems(
  subscriptionId: string
): Promise<SubscriptionItem[]> {
  return db
    .select()
    .from(subscriptionItem)
    .where(eq(subscriptionItem.subscriptionId, subscriptionId));
}

export async function deleteSubscriptionsByReferenceId(
  referenceId: string
): Promise<void> {
  const subs = await db
    .select({ id: subscription.id })
    .from(subscription)
    .where(eq(subscription.referenceId, referenceId));

  for (const sub of subs) {
    await deleteSubscriptionItems(sub.id);
  }

  await db.delete(subscription).where(eq(subscription.referenceId, referenceId));
}