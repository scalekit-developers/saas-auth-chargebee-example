import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/cookies';
import AppShell from '@/components/layout/AppShell';
import IntegrationDiagram from '@/components/education/IntegrationDiagram';

export default async function Home() {
  const session = getSession();

  if (session) {
    redirect('/guide');
  }

  return (
    <AppShell>
      <main className="container mt-5 mb-5">
        <div className="row justify-content-center">
          <div className="col-lg-9">
            <div className="text-center mb-5">
              <h1 className="display-5">Org-mode billing for B2B SaaS</h1>
              <p className="lead text-muted">
                A reference app showing how Scalekit tenant auth and Chargebee subscriptions
                work together — for developers building multi-tenant products.
              </p>
            </div>

            <div className="card mb-4">
              <div className="card-body text-center p-4">
                <h2 className="h4">Run the guided demo</h2>
                <p className="text-muted mb-4">
                  Sign in with a Scalekit user in an organization, then follow the integration
                  journey from customer provisioning through hosted checkout.
                </p>
                <Link href="/login" className="btn btn-primary btn-lg">
                  Sign in to start
                </Link>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h6">Scalekit</h3>
                    <p className="small text-muted mb-0">
                      Enterprise login, organizations, and <code>oid</code> for per-tenant
                      billing context.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h6">Chargebee</h3>
                    <p className="small text-muted mb-0">
                      Plans, hosted checkout, customer portal, and billing webhooks.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-body">
                    <h3 className="h6">Your app</h3>
                    <p className="small text-muted mb-0">
                      SQLite sync + hooks in <code>lib/subscription-hooks.ts</code> you can
                      replace with your stack.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="h6 mb-0">Architecture at a glance</h2>
              </div>
              <div className="card-body">
                <IntegrationDiagram />
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}