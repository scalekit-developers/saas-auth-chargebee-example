import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const organization = sqliteTable('organization', {
  id: text('id').primaryKey(),
  chargebeeCustomerId: text('chargebee_customer_id').unique(),
  displayName: text('display_name'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const subscription = sqliteTable('subscription', {
  id: text('id').primaryKey(),
  referenceId: text('reference_id').notNull(),
  chargebeeCustomerId: text('chargebee_customer_id'),
  chargebeeSubscriptionId: text('chargebee_subscription_id').unique(),
  status: text('status').notNull().default('future'),
  periodStart: integer('period_start', { mode: 'timestamp' }),
  periodEnd: integer('period_end', { mode: 'timestamp' }),
  trialStart: integer('trial_start', { mode: 'timestamp' }),
  trialEnd: integer('trial_end', { mode: 'timestamp' }),
  canceledAt: integer('canceled_at', { mode: 'timestamp' }),
  seats: integer('seats'),
  metadata: text('metadata'),
});

export const subscriptionItem = sqliteTable('subscription_item', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id')
    .notNull()
    .references(() => subscription.id, { onDelete: 'cascade' }),
  itemPriceId: text('item_price_id').notNull(),
  itemType: text('item_type').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price'),
  amount: integer('amount'),
});

export type Organization = typeof organization.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
export type SubscriptionItem = typeof subscriptionItem.$inferSelect;