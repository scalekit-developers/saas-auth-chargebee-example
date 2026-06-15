'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import BillingEducationSidebar from '@/components/education/BillingEducationSidebar';
import PlanPicker, { type PlanOption } from '@/components/PlanPicker';
import SubscriptionCard, {
  type SubscriptionSummary,
} from '@/components/SubscriptionCard';

type SessionResponse = {
  user: { id: string; email: string };
  organizationId: string;
  plans?: PlanOption[];
};

type BillingState = 'loading' | 'no-org' | 'ready' | 'error';

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed');
  }
  return data as T;
}

export default function BillingPage() {
  const searchParams = useSearchParams();
  const showSuccess = searchParams.get('success') === '1';

  const [state, setState] = useState<BillingState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const loadBilling = useCallback(async () => {
    setState('loading');
    setError(null);

    const sessionRes = await fetch('/api/session', { credentials: 'include' });
    if (sessionRes.status === 403) {
      setState('no-org');
      return;
    }
    if (!sessionRes.ok) {
      const data = await sessionRes.json().catch(() => ({}));
      setError(data.error ?? 'Failed to load session');
      setState('error');
      return;
    }

    const sessionData = (await sessionRes.json()) as SessionResponse;
    setSession(sessionData);

    const listRes = await fetch('/api/subscription/list', {
      credentials: 'include',
    });
    if (!listRes.ok) {
      const data = await listRes.json().catch(() => ({}));
      setError(data.error ?? 'Failed to load subscriptions');
      setState('error');
      return;
    }

    const subs = (await listRes.json()) as SubscriptionSummary[];
    setSubscriptions(subs);
    setState('ready');
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const openHostedPage = async (url: string) => {
    if (!url) throw new Error('No checkout URL returned');
    window.location.href = url;
  };

  const handleSubscribe = async (itemPriceId: string) => {
    setActionLoading(true);
    setError(null);
    try {
      const result = await postJson<{
        mode?: 'hosted' | 'embedded';
        url?: string;
        hostedPageId?: string;
        paymentIntentId?: string;
        chargebeeSite?: string;
        chargebeePublishableKey?: string;
        successUrl?: string;
      }>('/api/subscription/create', {
        itemPriceId,
      });

      if (result.mode === 'embedded') {
        const params = new URLSearchParams({
          hostedPageId: result.hostedPageId ?? '',
          paymentIntentId: result.paymentIntentId ?? '',
          chargebeeSite: result.chargebeeSite ?? '',
          chargebeePublishableKey: result.chargebeePublishableKey ?? '',
          successUrl: result.successUrl ?? '/billing?success=1',
        });
        window.location.href = `/billing/checkout?${params.toString()}`;
        return;
      }

      await openHostedPage(result.url ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setActionLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const { url } = await postJson<{ url: string }>('/api/subscription/portal', {
        returnUrl: '/billing',
      });
      await openHostedPage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed');
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const active = subscriptions[0];
      const { url } = await postJson<{ url: string }>('/api/subscription/cancel', {
        returnUrl: '/billing',
        subscriptionId: active?.chargebeeSubscriptionId ?? undefined,
      });
      await openHostedPage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed');
      setActionLoading(false);
    }
  };

  const activeSubscription = subscriptions[0];
  const userEmail = session?.user.email;

  return (
    <AppShell active="billing" userEmail={userEmail}>
      <main className="container mt-4 mb-5">
        <div className="row mb-3">
          <div className="col-lg-8">
            <h1>Billing</h1>
            <p className="lead text-muted">
              Organization-scoped subscriptions. Your org id (<code>oid</code>) is the
              Chargebee reference id for checkout and webhooks.
            </p>
            <p className="small mb-0">
              <Link href="/guide">Read the integration guide</Link> for setup and expectations.
            </p>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-8">
            {showSuccess && (
              <div className="alert alert-success">
                <strong>Checkout complete.</strong> Chargebee webhooks sync your subscription
                asynchronously — refresh this page in a few seconds if status is still pending.
              </div>
            )}

            {error && <div className="alert alert-danger">{error}</div>}

            {state === 'loading' && (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading…</span>
                </div>
              </div>
            )}

            {state === 'no-org' && (
              <div className="alert alert-warning">
                <h2 className="h5 alert-heading">Organization required</h2>
                <p className="mb-0">
                  Join or create an organization in Scalekit before managing billing. B2B billing
                  uses the <code>oid</code> claim from your access token as the subscription
                  reference. See the <Link href="/guide">guide</Link> for details.
                </p>
              </div>
            )}

            {state === 'error' && (
              <button type="button" className="btn btn-outline-primary" onClick={loadBilling}>
                Retry
              </button>
            )}

            {state === 'ready' && session && (
              <>
                <div className="card mb-4">
                  <div className="card-body">
                    <p className="mb-1">
                      <strong>Signed in as:</strong> {session.user.email}
                    </p>
                    <p className="mb-0 text-muted">
                      <strong>Organization:</strong> {session.organizationId}
                    </p>
                  </div>
                </div>

                {activeSubscription ? (
                  <SubscriptionCard
                    subscription={activeSubscription}
                    onPortal={handlePortal}
                    onCancel={handleCancel}
                    loading={actionLoading}
                  />
                ) : (
                  <>
                    <h2 className="h4 mb-3">Choose a plan</h2>
                    <PlanPicker
                      plans={session.plans ?? []}
                      onSelect={handleSubscribe}
                      loading={actionLoading}
                    />
                  </>
                )}
              </>
            )}
          </div>

          <div className="col-lg-4 mt-4 mt-lg-0">
            <BillingEducationSidebar checkoutJustCompleted={showSuccess} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}