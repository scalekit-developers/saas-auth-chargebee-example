'use client';

import JourneyStepper from '@/components/education/JourneyStepper';
import NextStepPanel from '@/components/education/NextStepPanel';
import { useDemoStatus } from '@/components/education/useDemoStatus';
import { getJourneyStep } from '@/lib/demo/journey';

export default function GuideJourneyClient() {
  const { status, loading, error, reload } = useDemoStatus();

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border spinner-border-sm text-primary" role="status">
          <span className="visually-hidden">Loading journey…</span>
        </div>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="alert alert-warning">
        Could not load journey status.{' '}
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={reload}>
          Retry
        </button>
      </div>
    );
  }

  const current = getJourneyStep(status.journey.nextStepId);

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <JourneyStepper journey={status.journey} />
      </div>
      <div className="col-lg-4">
        <NextStepPanel
          label={status.journey.nextCta.label}
          href={status.journey.nextCta.href}
          expectation={current?.expect}
        />
        {status.organizationId && (
          <p className="small text-muted mt-3 mb-0">
            Org id: <code>{status.organizationId}</code>
            {status.chargebeeCustomerId && (
              <>
                <br />
                Chargebee customer: <code>{status.chargebeeCustomerId}</code>
              </>
            )}
          </p>
        )}
        {!status.hasOrg && status.isAuthenticated && (
          <div className="alert alert-warning small mt-3 mb-0">
            Your token has no <code>oid</code> claim. Join or create an organization in
            Scalekit, then sign in again.
          </div>
        )}
      </div>
    </div>
  );
}