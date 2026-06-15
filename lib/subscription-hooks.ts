export type CustomerCreateHookParams = {
  organizationId: string;
  chargebeeCustomerId: string;
  displayName?: string | null;
};

export type SubscriptionHookContext = {
  referenceId: string;
  subscriptionId: string;
  chargebeeSubscriptionId: string;
  status: string;
};

export type AuthorizeReferenceHookParams = {
  userId: string;
  organizationId: string;
  referenceId: string;
  action: 'create' | 'update' | 'cancel' | 'portal' | 'list';
};

/** Demo hook — replace with app-specific logic (e.g. analytics, CRM sync). */
export async function onCustomerCreate(
  params: CustomerCreateHookParams
): Promise<void> {
  console.log('[billing] onCustomerCreate', params);
}

export async function onSubscriptionCreated(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onSubscriptionCreated', ctx);
}

export async function onSubscriptionComplete(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onSubscriptionComplete', ctx);
}

export async function onSubscriptionUpdated(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onSubscriptionUpdated', ctx);
}

export async function onSubscriptionDeleted(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onSubscriptionDeleted', ctx);
}

export async function onSubscriptionCancel(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onSubscriptionCancel', ctx);
}

export async function onTrialStart(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onTrialStart', ctx);
}

export async function onTrialEnd(
  ctx: SubscriptionHookContext
): Promise<void> {
  console.log('[billing] onTrialEnd', ctx);
}

/** Return false to deny billing actions for a reference. */
export async function onAuthorizeReference(
  _params: AuthorizeReferenceHookParams
): Promise<boolean> {
  return true;
}

// Example customization:
// onSubscriptionComplete: async ({ referenceId }) => {
//   await enableSsoForOrg(referenceId);
// }