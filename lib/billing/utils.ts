import type { Subscription as CbSubscription } from 'chargebee';

const ACTIVE_OR_TRIALING = new Set(['active', 'in_trial', 'non_renewing']);

export function isActiveOrTrialing(status: string): boolean {
  return ACTIVE_OR_TRIALING.has(status);
}

export function isPendingCancel(cbSub: CbSubscription): boolean {
  return Boolean(cbSub.cancel_schedule_created_at) && !cbSub.cancelled_at;
}

export function unixToDate(timestamp?: number): Date | null {
  if (timestamp == null) return null;
  return new Date(timestamp * 1000);
}

export function readMetaString(
  meta: Record<string, unknown> | null | undefined,
  key: string
): string | null {
  if (!meta || meta[key] == null) return null;
  return String(meta[key]);
}

export function extractSeats(cbSub: CbSubscription): number | null {
  const planItem = cbSub.subscription_items?.find(
    (item) => item.item_type === 'plan'
  );
  if (planItem?.quantity != null) return planItem.quantity;
  if (cbSub.plan_quantity != null) return cbSub.plan_quantity;
  return null;
}