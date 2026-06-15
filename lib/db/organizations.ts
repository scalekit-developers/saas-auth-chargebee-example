import { eq } from 'drizzle-orm';
import { db } from './index';
import { organization, type Organization } from './schema';

export async function findOrganizationByChargebeeCustomerId(
  chargebeeCustomerId: string
): Promise<Organization | undefined> {
  const rows = await db
    .select()
    .from(organization)
    .where(eq(organization.chargebeeCustomerId, chargebeeCustomerId))
    .limit(1);
  return rows[0];
}

export async function getOrganizationById(
  id: string
): Promise<Organization | undefined> {
  const rows = await db
    .select()
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);
  return rows[0];
}

export async function upsertOrganization(input: {
  id: string;
  displayName?: string | null;
  chargebeeCustomerId?: string | null;
}): Promise<Organization> {
  const now = new Date();
  const existing = await getOrganizationById(input.id);

  if (existing) {
    await db
      .update(organization)
      .set({
        displayName: input.displayName ?? existing.displayName,
        chargebeeCustomerId:
          input.chargebeeCustomerId ?? existing.chargebeeCustomerId,
        updatedAt: now,
      })
      .where(eq(organization.id, input.id));
    return (await getOrganizationById(input.id))!;
  }

  await db.insert(organization).values({
    id: input.id,
    displayName: input.displayName ?? null,
    chargebeeCustomerId: input.chargebeeCustomerId ?? null,
    updatedAt: now,
  });
  return (await getOrganizationById(input.id))!;
}

export async function setChargebeeCustomerId(
  orgId: string,
  customerId: string
): Promise<void> {
  await db
    .update(organization)
    .set({ chargebeeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(organization.id, orgId));
}

export async function clearChargebeeCustomerId(orgId: string): Promise<void> {
  await db
    .update(organization)
    .set({ chargebeeCustomerId: null, updatedAt: new Date() })
    .where(eq(organization.id, orgId));
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await db.delete(organization).where(eq(organization.id, orgId));
}