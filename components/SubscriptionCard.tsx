'use client';

import { format } from 'date-fns';

export type SubscriptionSummary = {
  id: string;
  status: string;
  itemPriceId?: string;
  seats?: number | null;
  periodEnd?: string | Date | null;
  trialEnd?: string | Date | null;
  limits?: Record<string, number>;
  chargebeeSubscriptionId?: string | null;
};

type SubscriptionCardProps = {
  subscription: SubscriptionSummary;
  onPortal: () => void;
  onCancel: () => void;
  loading?: boolean;
};

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy');
}

export default function SubscriptionCard({
  subscription,
  onPortal,
  onCancel,
  loading,
}: SubscriptionCardProps) {
  const statusLabel = subscription.status.replace(/_/g, ' ');

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Current subscription</h5>
        <span className="badge bg-primary text-capitalize">{statusLabel}</span>
      </div>
      <div className="card-body">
        {subscription.itemPriceId && (
          <p className="mb-2">
            <strong>Plan:</strong> {subscription.itemPriceId}
          </p>
        )}
        {subscription.seats != null && (
          <p className="mb-2">
            <strong>Seats:</strong> {subscription.seats}
            {subscription.limits?.seats != null && (
              <span className="text-muted"> / {subscription.limits.seats} included</span>
            )}
          </p>
        )}
        {subscription.periodEnd && (
          <p className="mb-2">
            <strong>Current period ends:</strong> {formatDate(subscription.periodEnd)}
          </p>
        )}
        {subscription.trialEnd && subscription.status === 'in_trial' && (
          <p className="mb-2">
            <strong>Trial ends:</strong> {formatDate(subscription.trialEnd)}
          </p>
        )}
        <div className="d-flex gap-2 mt-3">
          <button
            type="button"
            className="btn btn-outline-primary"
            disabled={loading}
            onClick={onPortal}
          >
            Manage billing
          </button>
          <button
            type="button"
            className="btn btn-outline-danger"
            disabled={loading}
            onClick={onCancel}
          >
            Cancel subscription
          </button>
        </div>
      </div>
    </div>
  );
}