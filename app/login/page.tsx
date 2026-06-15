import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/cookies';
import AppShell from '@/components/layout/AppShell';
import LoginButton from '@/components/LoginButton';

export default async function LoginPage() {
  const session = getSession();

  if (session) {
    redirect('/guide');
  }

  return (
    <AppShell active="login">
      <div className="container">
        <div className="row justify-content-center mt-5">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h1 className="h2">Sign in to run the billing demo</h1>
                  <p className="text-muted">
                    Use a Scalekit user that belongs to an organization. Billing routes require
                    the <code>oid</code> claim in your access token.
                  </p>
                </div>

                <div className="d-grid gap-2">
                  <LoginButton />
                </div>

                <hr className="my-4" />

                <div className="text-center">
                  <Link href="/" className="text-decoration-none">
                    ← Back to home
                  </Link>
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <div className="card-body small text-muted">
                <strong>Before you subscribe:</strong> ensure your Scalekit org exists and the{' '}
                <code>organization.created</code> webhook has created a Chargebee customer. The
                guide page shows live progress after sign-in.
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}