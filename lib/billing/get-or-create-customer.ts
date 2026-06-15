import { createOrgCustomer } from '@/lib/billing/create-org-customer';
import { getOrganizationById } from '@/lib/db/organizations';

export async function getOrCreateCustomerId(input: {
  organizationId: string;
  email?: string | null;
  displayName?: string | null;
}): Promise<string> {
  const org = await getOrganizationById(input.organizationId);
  if (org?.chargebeeCustomerId) {
    return org.chargebeeCustomerId;
  }

  const customerId = await createOrgCustomer({
    organizationId: input.organizationId,
    displayName: input.displayName ?? org?.displayName,
    email: input.email,
  });

  if (!customerId) {
    throw new Error('Unable to create Chargebee customer for organization');
  }

  return customerId;
}