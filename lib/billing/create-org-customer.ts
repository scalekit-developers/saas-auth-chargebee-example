import { getChargebeeClient } from '@/lib/chargebee';
import {
  getOrganizationById,
  setChargebeeCustomerId,
  upsertOrganization,
} from '@/lib/db/organizations';
import { onCustomerCreate } from '@/lib/subscription-hooks';

export type CreateOrgCustomerInput = {
  organizationId: string;
  displayName?: string | null;
  email?: string | null;
};

export async function createOrgCustomer(
  input: CreateOrgCustomerInput
): Promise<string | null> {
  const { organizationId, displayName, email } = input;

  await upsertOrganization({
    id: organizationId,
    displayName: displayName ?? null,
  });

  const existing = await getOrganizationById(organizationId);
  if (existing?.chargebeeCustomerId) {
    return existing.chargebeeCustomerId;
  }

  const chargebee = getChargebeeClient();

  const { customer } = await chargebee.customer.create({
    company: displayName ?? undefined,
    email: email ?? undefined,
    preferred_currency_code: 'USD',
    meta_data: {
      organizationId,
      customerType: 'organization',
    },
  });

  const refreshed = await getOrganizationById(organizationId);
  if (refreshed?.chargebeeCustomerId) {
    if (refreshed.chargebeeCustomerId !== customer.id) {
      try {
        await chargebee.customer.delete(customer.id);
      } catch (err) {
        console.error(
          '[billing] Failed to delete duplicate Chargebee customer',
          err
        );
      }
    }
    return refreshed.chargebeeCustomerId;
  }

  await setChargebeeCustomerId(organizationId, customer.id);

  await onCustomerCreate({
    organizationId,
    chargebeeCustomerId: customer.id,
    displayName,
  });

  return customer.id;
}