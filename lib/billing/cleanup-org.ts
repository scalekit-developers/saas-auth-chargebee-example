import { getChargebeeClient } from '@/lib/chargebee';
import {
  clearChargebeeCustomerId,
  deleteOrganization,
  getOrganizationById,
} from '@/lib/db/organizations';
import { deleteSubscriptionsByReferenceId } from '@/lib/db/subscriptions';

const CANCELLABLE_STATUSES = new Set([
  'active',
  'in_trial',
  'non_renewing',
  'future',
  'paused',
]);

export async function cleanupOrganizationBilling(
  organizationId: string
): Promise<void> {
  const org = await getOrganizationById(organizationId);

  if (org?.chargebeeCustomerId) {
    const chargebee = getChargebeeClient();
    let offset: string | undefined;

    do {
      const response = await chargebee.subscription.list({
        customer_id: { is: org.chargebeeCustomerId },
        limit: 100,
        offset,
      });

      for (const entry of response.list) {
        const sub = entry.subscription;
        if (!sub?.id || !CANCELLABLE_STATUSES.has(sub.status)) {
          continue;
        }

        try {
          await chargebee.subscription.cancel(sub.id, {
            end_of_term: false,
          });
        } catch (err) {
          console.error(
            `[billing] Failed to cancel Chargebee subscription ${sub.id}`,
            err
          );
        }
      }

      offset = response.next_offset;
    } while (offset);
  }

  await deleteSubscriptionsByReferenceId(organizationId);
  await clearChargebeeCustomerId(organizationId);
  await deleteOrganization(organizationId);
}