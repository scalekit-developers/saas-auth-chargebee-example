import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/cookies';
import AppShell from '@/components/layout/AppShell';
import DashboardJourneyClient from '@/components/education/DashboardJourneyClient';
import PrintButton from '@/components/PrintButton';
import SessionTime from '@/components/SessionTime';
import { format } from 'date-fns';

export default async function DashboardPage() {
  const session = getSession();

  if (!session) {
    redirect('/login');
  }

  const { user, tokens, roles, permissions } = session;
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
  const userEmail = user.email ?? 'Signed in';

  return (
    <AppShell active="dashboard" userEmail={userEmail}>
      <main className="container mt-4 mb-5">
        <div className="row">
          <div className="col-12">
            <h1>Integration status</h1>
            <p className="lead text-muted">
              Track where you are in the Scalekit + Chargebee flow. Session details below are
              useful when debugging auth during local setup.
            </p>
          </div>
        </div>

        <DashboardJourneyClient />

        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h2 className="h6 mb-0">User information</h2>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-sm-3">
                    <strong>Name:</strong>
                  </div>
                  <div className="col-sm-9">{user.name || 'N/A'}</div>
                </div>
                <hr />
                <div className="row">
                  <div className="col-sm-3">
                    <strong>Email:</strong>
                  </div>
                  <div className="col-sm-9">{user.email || 'N/A'}</div>
                </div>
                <hr />
                <div className="row">
                  <div className="col-sm-3">
                    <strong>Subject:</strong>
                  </div>
                  <div className="col-sm-9">{user.sub || 'N/A'}</div>
                </div>
              </div>
            </div>

            {(roles && roles.length > 0) || (permissions && permissions.length > 0) ? (
              <div className="card mt-4">
                <div className="card-header">
                  <h2 className="h6 mb-0">Roles and permissions</h2>
                </div>
                <div className="card-body">
                  {roles && roles.length > 0 && (
                    <div className="mb-3">
                      <strong>Roles:</strong>
                      {roles.map((role, idx) => (
                        <span key={idx} className="badge bg-secondary ms-1">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                  {permissions && permissions.length > 0 && (
                    <div>
                      <strong>Permissions:</strong>
                      {permissions.map((permission, idx) => (
                        <span key={idx} className="badge bg-info ms-1">
                          {permission}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h2 className="h6 mb-0">Quick actions</h2>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link href="/guide" className="btn btn-outline-primary btn-sm">
                    Open guide
                  </Link>
                  <Link href="/billing" className="btn btn-outline-success btn-sm">
                    Billing
                  </Link>
                  <PrintButton />
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h2 className="h6 mb-0">Session status</h2>
              </div>
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <span className="badge bg-success me-2">Active</span>
                  <small className="text-muted">Authenticated via Scalekit OIDC</small>
                </div>
                <small className="text-muted d-block mt-2">
                  Session established: <SessionTime />
                </small>
                {expiresAt && (
                  <small className="text-muted d-block mt-1">
                    Token expires: {format(expiresAt, 'yyyy-MM-dd HH:mm:ss')}
                  </small>
                )}
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h2 className="h6 mb-0">Management</h2>
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Link href="/sessions" className="btn btn-outline-info btn-sm">
                    Session management
                  </Link>
                  <Link
                    href="/organization/settings"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Organization settings
                  </Link>
                  <small className="text-muted mt-2">
                    Settings route requires <code>organization:settings</code> permission.
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}