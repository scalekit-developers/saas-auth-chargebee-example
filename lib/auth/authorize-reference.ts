import { onAuthorizeReference } from '@/lib/subscription-hooks';

export type AuthorizeReferenceAction =
  | 'create'
  | 'update'
  | 'cancel'
  | 'portal'
  | 'list';

export async function authorizeReference({
  userId,
  organizationId,
  referenceId,
  action,
}: {
  userId: string;
  organizationId: string;
  referenceId: string;
  action: AuthorizeReferenceAction;
}): Promise<boolean> {
  if (referenceId !== organizationId) {
    return false;
  }

  const hookResult = await onAuthorizeReference({
    userId,
    organizationId,
    referenceId,
    action,
  });

  return hookResult !== false;
}