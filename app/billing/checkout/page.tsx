'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import AppShell from '@/components/layout/AppShell';

type PaymentIntent = {
  id: string;
  status?: string;
  amount?: number;
  currency_code?: string;
  customer_id?: string;
  gateway_account_id?: string;
  payment_method_type?: string;
};

type ChargebeeComponent = {
  mount: (selector: string) => Promise<boolean>;
  close?: () => void;
};

type ChargebeeComponentsFactory = {
  create: (
    name: 'payment' | 'payment-button',
    options?: Record<string, unknown>,
    callbacks?: Record<string, unknown>
  ) => ChargebeeComponent;
};

type ChargebeeInstance = {
  components: (options?: Record<string, unknown>) => ChargebeeComponentsFactory;
};

declare global {
  interface Window {
    Chargebee?: {
      init: (config: {
        site: string;
        publishableKey: string;
      }) => ChargebeeInstance;
    };
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed');
  }
  return data as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Request failed');
  }
  return data as T;
}

export default function BillingCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hostedPageId = searchParams.get('hostedPageId') ?? '';
  const paymentIntentId = searchParams.get('paymentIntentId') ?? '';
  const chargebeeSite =
    searchParams.get('chargebeeSite') ??
    process.env.NEXT_PUBLIC_CHARGEBEE_SITE ??
    '';
  const publishableKey =
    searchParams.get('chargebeePublishableKey') ??
    process.env.NEXT_PUBLIC_CHARGEBEE_PUBLISHABLE_KEY ??
    '';
  const successUrl = searchParams.get('successUrl') ?? '/billing?success=1';

  const [scriptReady, setScriptReady] = useState(false);
  const [componentsReady, setComponentsReady] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const mountRunRef = useRef(0);
  const paymentComponentRef = useRef<ChargebeeComponent | null>(null);
  const paymentButtonComponentRef = useRef<ChargebeeComponent | null>(null);

  const completeCheckout = useCallback(
    async (authorizedPaymentIntentId: string) => {
      setCompleting(true);
      setError(null);
      try {
        const { redirectUrl } = await postJson<{ redirectUrl: string }>(
          '/api/subscription/complete',
          {
            hostedPageId,
            paymentIntentId: authorizedPaymentIntentId,
            successUrl,
          }
        );
        router.push(redirectUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to finish checkout');
        setCompleting(false);
      }
    },
    [hostedPageId, router, successUrl]
  );

  const closePaymentComponents = useCallback(() => {
    paymentButtonComponentRef.current?.close?.();
    paymentComponentRef.current?.close?.();
    paymentButtonComponentRef.current = null;
    paymentComponentRef.current = null;
    mountedRef.current = false;
    setComponentsReady(false);
  }, []);

  const mountPaymentComponents = useCallback(async (runId: number) => {
    if (
      !scriptReady ||
      mountedRef.current ||
      !chargebeeSite ||
      !publishableKey ||
      !paymentIntentId ||
      !window.Chargebee
    ) {
      return;
    }

    mountedRef.current = true;
    setError(null);

    try {
      const { paymentIntent } = await getJson<{ paymentIntent: PaymentIntent }>(
        `/api/subscription/payment-intent?paymentIntentId=${encodeURIComponent(paymentIntentId)}`
      );
      if (mountRunRef.current !== runId) return;

      const chargebee = window.Chargebee.init({
        site: chargebeeSite,
        publishableKey,
      });

      const components = chargebee.components({
        locale: 'en',
      });

      const paymentComponent = components.create(
        'payment',
        {
          paymentIntent: { id: paymentIntent.id },
          layout: { type: 'accordion', showRadioButtons: true },
          paymentMethods: {
            sortOrder: ['card'],
            allowed: ['card'],
          },
        },
        {
          onAppReady: () => {
            setComponentsReady(true);
          },
          onError: (componentError: { message?: string }) => {
            setError(componentError?.message ?? 'Payment failed');
          },
          onSuccess: (authorizedIntent: PaymentIntent) => {
            void completeCheckout(authorizedIntent.id ?? paymentIntentId);
          },
        }
      );
      paymentComponentRef.current = paymentComponent;
      const paymentMounted = await paymentComponent.mount('#chargebee-payment');
      if (mountRunRef.current !== runId) {
        paymentComponent.close?.();
        return;
      }
      if (!paymentMounted) {
        throw new Error('Chargebee payment component failed to mount');
      }

      const paymentButtonComponent = components.create(
        'payment-button',
        {
          paymentMethods: {
            options: {
              card: { text: 'Pay' },
            },
          },
        },
        {
          onError: (componentError: { message?: string }) => {
            setError(componentError?.message ?? 'Payment failed');
          },
        }
      );
      paymentButtonComponentRef.current = paymentButtonComponent;
      const buttonMounted = await paymentButtonComponent.mount(
        '#chargebee-payment-button'
      );
      if (mountRunRef.current !== runId) {
        paymentButtonComponent.close?.();
        return;
      }
      if (!buttonMounted) {
        throw new Error('Chargebee payment button failed to mount');
      }

      setComponentsReady(true);
    } catch (err) {
      closePaymentComponents();
      setError(
        err instanceof Error ? err.message : 'Failed to load payment fields'
      );
    }
  }, [
    chargebeeSite,
    closePaymentComponents,
    completeCheckout,
    paymentIntentId,
    publishableKey,
    scriptReady,
  ]);

  useEffect(() => {
    const runId = mountRunRef.current + 1;
    mountRunRef.current = runId;
    void mountPaymentComponents(runId);
    return () => {
      mountRunRef.current += 1;
      closePaymentComponents();
    };
  }, [closePaymentComponents, mountPaymentComponents]);

  const missingParams =
    !hostedPageId ||
    !paymentIntentId ||
    !chargebeeSite ||
    !publishableKey;

  return (
    <AppShell active="billing">
      <Script
        src="https://js.chargebee.com/v2/chargebee.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() =>
          setError('Failed to load Chargebee.js. Check your network and retry.')
        }
      />
      <main className="container mt-4 mb-5" style={{ maxWidth: 560 }}>
        <h1>Complete checkout</h1>
        <p className="text-muted">
          Your Chargebee site requires an explicit test gateway. This in-app form
          collects your card and finishes the hosted checkout session.
        </p>

        {missingParams && (
          <div className="alert alert-warning">
            Missing checkout configuration (site, publishable key, or session).{' '}
            <Link href="/billing">Return to billing</Link> and subscribe again.
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}
        {completing && (
          <div className="alert alert-info">Finishing subscription…</div>
        )}

        {!missingParams && (
          <div className="card">
            <div className="card-body">
              <h2 className="h5">Payment method</h2>
              <p className="small text-muted">
                Sandbox test card: <code>4111 1111 1111 1111</code>, any future
                expiry, any CVC.
              </p>
              <div
                id="chargebee-payment"
                className="mb-3"
                style={{ minHeight: 120 }}
              />
              <div id="chargebee-payment-button" className="mb-3" />
              {!componentsReady && !error && (
                <p className="small text-muted">Loading secure payment fields…</p>
              )}
              <Link href="/billing" className="btn btn-outline-secondary">
                Cancel
              </Link>
            </div>
          </div>
        )}
      </main>
    </AppShell>
  );
}