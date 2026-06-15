import { redirect } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import ApiRouteTable from '@/components/education/ApiRouteTable';
import FileMapTable from '@/components/education/FileMapTable';
import GuideJourneyClient from '@/components/education/GuideJourneyClient';
import IntegrationDiagram from '@/components/education/IntegrationDiagram';
import ValuePropCards from '@/components/education/ValuePropCards';
import { getSession } from '@/lib/cookies';
import {
  FIVE_MINUTE_SCRIPT,
  HOOK_NAMES,
  SETUP_CHECKLIST,
  WHY_NOT_PLUGIN,
} from '@/lib/demo/guide-content';

export default function GuidePage() {
  const session = getSession();
  if (!session) {
    redirect('/login');
  }

  const userEmail = session.user.email ?? 'Signed in';

  return (
    <AppShell active="guide" userEmail={userEmail}>
      <main className="container mt-4 mb-5 guide-prose">
        <div className="mb-4">
          <h1>B2B billing with Scalekit + Chargebee</h1>
          <p className="lead text-muted">
            This sample ports Chargebee&apos;s org-mode billing flows to Scalekit FSA: tenant
            context from <code>oid</code>, auth webhooks for customer provisioning, hosted
            checkout, and webhook-driven subscription sync.
          </p>
        </div>

        <section className="mb-5">
          <h2>What each product does</h2>
          <ValuePropCards />
        </section>

        <section className="mb-5" id="architecture">
          <h2>How it fits together</h2>
          <IntegrationDiagram />
        </section>

        <section className="mb-5">
          <h2>Your progress</h2>
          <GuideJourneyClient />
        </section>

        <section className="mb-5">
          <h2>5-minute test script</h2>
          <ol>
            {FIVE_MINUTE_SCRIPT.map((step) => (
              <li key={step} className="mb-2">
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-5" id="setup">
          <h2>Setup checklist</h2>
          <p className="text-muted small">
            Set these in <code>.env</code> (see <code>.env.example</code>). Use a tunnel for
            webhook URLs during local development.
          </p>
          <ul className="list-unstyled row row-cols-1 row-cols-md-2 g-2">
            {SETUP_CHECKLIST.map((name) => (
              <li key={name} className="col">
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-5">
          <h2>Files to fork</h2>
          <FileMapTable />
        </section>

        <section className="mb-5">
          <h2>API routes</h2>
          <ApiRouteTable />
        </section>

        <section className="mb-5" id="customize">
          <h2>Customize</h2>
          <div className="alert alert-info">
            Edit <code>lib/subscription-hooks.ts</code> to plug in analytics, CRM sync, or
            feature gating when billing events fire.
          </div>
          <ul className="small">
            {HOOK_NAMES.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-4">
          <h2>Why not a Scalekit plugin?</h2>
          <p className="text-muted">{WHY_NOT_PLUGIN}</p>
        </section>

        <Link href="/billing" className="btn btn-primary">
          Open billing demo
        </Link>
      </main>
    </AppShell>
  );
}