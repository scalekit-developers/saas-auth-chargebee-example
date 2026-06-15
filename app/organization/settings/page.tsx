import { redirect } from 'next/navigation';
import { getSession } from '@/lib/cookies';
import { hasPermission } from '@/lib/auth';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

export default async function OrganizationSettingsPage() {
  const session = getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Check permission
  const hasOrgSettingsPermission = await hasPermission('organization:settings');
  
  if (!hasOrgSettingsPermission) {
    redirect('/permission-denied');
  }

  const { user, permissions } = session;

  const userEmail = user.email ?? 'Signed in';

  return (
    <AppShell active="organization" userEmail={userEmail}>
      <main className="container mt-4 mb-5">
        <p className="small text-muted mb-3">
          <Link href="/guide">← Guide</Link>
        </p>
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1>Organization settings</h1>
              <span className="badge bg-success">Protected Route</span>
            </div>

            <div className="alert alert-success">
              <h5>✅ Access Granted</h5>
              <p className="mb-0">
                You have successfully accessed this protected route! This page requires the 
                <strong> 'organization:settings'</strong> permission, which was validated from your access token 
                using Scalekit SDK's <code>validateToken</code> method.
              </p>
            </div>

            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Permission Information</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Required Permission</h6>
                    <p>
                      <span className="badge bg-primary">organization:settings</span>
                    </p>
                    <p className="text-muted small">
                      This permission was extracted from your access token using Scalekit SDK's 
                      <code>validateToken()</code> method.
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Your Permissions</h6>
                    {permissions && permissions.length > 0 ? (
                      <div>
                        {permissions.map((perm, idx) => (
                          <span key={idx} className="badge bg-secondary me-1 mb-1">{perm}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted">No permissions found in token</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h5 className="mb-0">Example Settings</h5>
              </div>
              <div className="card-body">
                <p>This is an example of a protected route that requires specific permissions.</p>
                <p className="text-muted">
                  Only users with the <code>organization:settings</code> permission in their access token 
                  can access this page. The permission check is performed using Scalekit SDK's token validation.
                </p>
                
                <div className="mt-4">
                  <h6>How It Works:</h6>
                  <ol>
                    <li>User must be authenticated (have a valid Scalekit session)</li>
                    <li>The access token is retrieved from the session</li>
                    <li>Scalekit SDK's <code>validateToken()</code> is called</li>
                    <li>Permissions are extracted from the token claims</li>
                    <li>If <code>organization:settings</code> is present, access is granted</li>
                    <li>Otherwise, a 403 Forbidden response is returned</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Link href="/dashboard" className="btn btn-secondary">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

