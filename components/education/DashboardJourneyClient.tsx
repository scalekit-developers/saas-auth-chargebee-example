'use client';

import JourneyStepper from '@/components/education/JourneyStepper';
import NextStepPanel from '@/components/education/NextStepPanel';
import { useDemoStatus } from '@/components/education/useDemoStatus';
import { getJourneyStep } from '@/lib/demo/journey';

export default function DashboardJourneyClient() {
  const { status, loading, error, reload } = useDemoStatus();

  if (loading) {
    return (
      <div className="card mb-4">
        <div className="card-body text-center py-4">
          <div className="spinner-border spinner-border-sm text-primary" role="status" />
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="alert alert-warning mb-4">
        Could not load integration status.{' '}
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  const current = getJourneyStep(status.journey.nextStepId);

  return (
    <div className="row g-4 mb-4">
      <div className="col-lg-8">
        <div className="card">
          <div className="card-body">
            <JourneyStepper journey={status.journey} />
          </div>
        </div>
      </div>
      <div className="col-lg-4">
        <NextStepPanel
          label={status.journey.nextCta.label}
          href={status.journey.nextCta.href}
          expectation={current?.expect}
        />
        {status.organizationId && (
          <div className="card mt-3">
            <div className="card-body small">
              <strong>Organization billing id</strong>
              <p className="mb-1 mt-2">
                <code>{status.organizationId}</code>
              </p>
              {status.chargebeeCustomerId ? (
                <p className="mb-0 text-muted">
                  Chargebee customer: <code>{status.chargebeeCustomerId}</code>
                </p>
              ) : (
                <p className="mb-0 text-muted">
                  Waiting for Scalekit org webhook to create Chargebee customer.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}