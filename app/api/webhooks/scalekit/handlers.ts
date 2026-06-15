import { createOrgCustomer } from '@/lib/billing/create-org-customer';
import { cleanupOrganizationBilling } from '@/lib/billing/cleanup-org';
import { upsertOrganization } from '@/lib/db/organizations';

export type ScalekitOrganizationPayload = {
  id?: string;
  display_name?: string | null;
  external_id?: string | null;
};

export type ScalekitWebhookEvent = {
  type: string;
  organization_id?: string;
  data?: ScalekitOrganizationPayload;
};

function resolveOrganizationId(event: ScalekitWebhookEvent): string | null {
  return event.organization_id ?? event.data?.id ?? null;
}

export async function dispatchScalekitEvent(
  event: ScalekitWebhookEvent
): Promise<void> {
  switch (event.type) {
    case 'organization.created':
      await handleOrganizationCreated(event);
      break;
    case 'organization.updated':
      await handleOrganizationUpdated(event);
      break;
    case 'organization.deleted':
      await handleOrganizationDeleted(event);
      break;
    default:
      console.log(`[scalekit-webhook] Unhandled event type: ${event.type}`);
  }
}

async function handleOrganizationCreated(
  event: ScalekitWebhookEvent
): Promise<void> {
  const organizationId = resolveOrganizationId(event);
  if (!organizationId) {
    console.error('[scalekit-webhook] organization.created missing org id');
    return;
  }

  await createOrgCustomer({
    organizationId,
    displayName: event.data?.display_name ?? null,
  });
}

async function handleOrganizationUpdated(
  event: ScalekitWebhookEvent
): Promise<void> {
  const organizationId = resolveOrganizationId(event);
  if (!organizationId) {
    console.error('[scalekit-webhook] organization.updated missing org id');
    return;
  }

  await upsertOrganization({
    id: organizationId,
    displayName: event.data?.display_name ?? null,
  });
}

async function handleOrganizationDeleted(
  event: ScalekitWebhookEvent
): Promise<void> {
  const organizationId = resolveOrganizationId(event);
  if (!organizationId) {
    console.error('[scalekit-webhook] organization.deleted missing org id');
    return;
  }

  await cleanupOrganizationBilling(organizationId);
}