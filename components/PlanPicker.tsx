'use client';

export type PlanOption = {
  itemPriceId: string;
  name: string;
  limits?: Record<string, number>;
  freeTrial?: { days: number };
};

type PlanPickerProps = {
  plans: PlanOption[];
  onSelect: (itemPriceId: string) => void;
  loading?: boolean;
};

export default function PlanPicker({ plans, onSelect, loading }: PlanPickerProps) {
  if (!plans.length) {
    return (
      <div className="alert alert-warning">
        No plans configured. Set <code>CHARGEBEE_PLAN_ITEM_PRICE_ID</code> in your environment.
      </div>
    );
  }

  return (
    <div className="row g-3">
      {plans.map((plan) => (
        <div className="col-md-6" key={plan.itemPriceId}>
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title">{plan.name}</h5>
              {plan.limits?.seats != null && (
                <p className="card-text text-muted">Up to {plan.limits.seats} seats</p>
              )}
              {plan.freeTrial?.days != null && (
                <p className="card-text">
                  <span className="badge bg-success">{plan.freeTrial.days}-day trial</span>
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary mt-auto"
                disabled={loading}
                onClick={() => onSelect(plan.itemPriceId)}
              >
                {loading ? 'Starting checkout…' : 'Subscribe'}
              </button>
              <p className="small text-muted mt-2 mb-0">
                Starts checkout with your test gateway (hosted redirect or in-app
                card form when Smart Routing is not configured).
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}