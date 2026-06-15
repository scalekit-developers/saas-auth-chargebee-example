'use client';

import { useCallback, useEffect, useState } from 'react';
import type { JourneyStatus } from '@/lib/demo/journey';

export type DemoStatusResponse = {
  isAuthenticated: boolean;
  hasOrg: boolean;
  hasChargebeeCustomer: boolean;
  hasActiveSubscription: boolean;
  organizationId?: string;
  chargebeeCustomerId?: string | null;
  subscriptionStatus?: string | null;
  checkout?: {
    appUrl: string;
    successRedirectExample: string;
    finalLandingPath: string;
    gatewayConfigured: boolean;
  };
  journey: JourneyStatus;
};

type UseDemoStatusResult = {
  status: DemoStatusResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useDemoStatus(checkoutJustCompleted = false): UseDemoStatusResult {
  const [status, setStatus] = useState<DemoStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/status', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load demo status');
      }
      const data = (await res.json()) as DemoStatusResponse;
      if (checkoutJustCompleted && data.journey) {
        data.journey = {
          ...data.journey,
          steps: data.journey.steps.map((step) =>
            step.id === 'webhooks-sync' && !data.hasActiveSubscription
              ? { ...step, state: 'current' as const }
              : step
          ),
          nextStepId: data.hasActiveSubscription
            ? data.journey.nextStepId
            : 'webhooks-sync',
          nextCta: data.hasActiveSubscription
            ? data.journey.nextCta
            : { label: 'Refresh billing', href: '/billing' },
        };
      }
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo status');
    } finally {
      setLoading(false);
    }
  }, [checkoutJustCompleted]);

  useEffect(() => {
    load();
  }, [load]);

  return { status, loading, error, reload: load };
}