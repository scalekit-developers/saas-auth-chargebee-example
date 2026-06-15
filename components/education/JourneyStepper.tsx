'use client';

import {
  getJourneyStep,
  getJourneySteps,
  type JourneyStatus,
} from '@/lib/demo/journey';

type JourneyStepperProps = {
  journey: JourneyStatus;
};

function badgeClass(state: 'done' | 'current' | 'pending'): string {
  if (state === 'done') return 'bg-success';
  if (state === 'current') return 'bg-primary';
  return 'bg-secondary';
}

export default function JourneyStepper({ journey }: JourneyStepperProps) {
  const steps = getJourneySteps();
  const currentStep = getJourneyStep(journey.nextStepId);

  return (
    <div>
      <h2 className="h6 mb-3">Integration journey</h2>
      <ol className="list-group list-group-numbered mb-3">
        {steps.map((step) => {
          const state = journey.steps.find((s) => s.id === step.id)?.state ?? 'pending';
          return (
            <li
              key={step.id}
              className={`list-group-item d-flex justify-content-between align-items-start journey-step-${state}`}
            >
              <div className="me-2">
                <div className="fw-semibold">{step.title}</div>
                {state === 'current' && (
                  <small className="text-muted d-block mt-1">{step.description}</small>
                )}
              </div>
              <span className={`badge ${badgeClass(state)} text-capitalize`}>
                {state}
              </span>
            </li>
          );
        })}
      </ol>
      {currentStep && (
        <div className="small text-muted">
          <strong>Expect:</strong> {currentStep.expect}
          {currentStep.codeRef && (
            <>
              {' '}
              — see <code>{currentStep.codeRef}</code>
            </>
          )}
        </div>
      )}
    </div>
  );
}