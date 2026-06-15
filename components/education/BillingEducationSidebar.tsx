'use client';

import CopyButton from '@/components/CopyButton';
import JourneyStepper from '@/components/education/JourneyStepper';
import { useDemoStatus } from '@/components/education/useDemoStatus';
import { CHECKOUT_TROUBLESHOOTING, SUBSCRIBE_FLOW } from '@/lib/demo/guide-content';

type BillingEducationSidebarProps = {
  checkoutJustCompleted?: boolean;
};

export default function BillingEducationSidebar({
  checkoutJustCompleted = false,
}: BillingEducationSidebarProps) {
  const { status, loading, error, reload } = useDemoStatus(checkoutJustCompleted);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card">
        <div className="card-body">
          {loading && (
            <div className="text-center py-3">
              <div className="spinner-border spinner-border-sm text-primary" role="status" />
            </div>
          )}
          {error && (
            <div className="alert alert-warning small mb-0">
              {error}{' '}
              <button type="button" className="btn btn-sm btn-link p-0" onClick={reload}>
                Retry
              </button>
            </div>
          )}
          {status && <JourneyStepper journey={status.journey} />}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h6">What happens when you subscribe</h2>
          <ol className="small mb-0 ps-3">
            {SUBSCRIBE_FLOW.map((step) => (
              <li key={step} className="mb-2">
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h6">API called</h2>
          <p className="small text-muted mb-2">
            Hosted checkout uses <code>CHARGEBEE_GATEWAY_ACCOUNT_ID</code> when set.
          </p>
          <div className="d-flex align-items-center gap-2">
            <code className="small">POST /api/subscription/create</code>
            <CopyButton text="POST /api/subscription/create" label="Copy" />
          </div>
          {status?.checkout && (
            <p className="small text-muted mt-3 mb-0">
              Redirect target: <code>{status.checkout.appUrl}</code> →{' '}
              <code>{status.checkout.finalLandingPath}</code>
              <br />
              Allowlist this domain in Chargebee checkout settings.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="h6">Checkout not redirecting?</h2>
          <ul className="small mb-0 ps-3">
            {CHECKOUT_TROUBLESHOOTING.map((tip) => (
              <li key={tip} className="mb-2">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}