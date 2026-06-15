import { redirect } from 'next/navigation';
import { getSession } from '@/lib/cookies';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';

export default async function PermissionDeniedPage() {
  const session = getSession();

  // If not authenticated, redirect to login
  if (!session) {
    redirect('/login');
  }

  const userEmail = session.user.email ?? 'Signed in';

  return (
    <AppShell active="dashboard" userEmail={userEmail}>
      <main className="container">
        <div className="access-denied-container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
          <div className="card access-denied-card" style={{ maxWidth: '500px', width: '100%', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)', border: '1px solid #dee2e6', borderRadius: '8px' }}>
            <div className="card-body p-5 text-center">
              <div className="mb-4">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <h4 className="mb-3 text-muted">Access Denied</h4>
              <p className="text-muted mb-4">You don't have permission to access this page.</p>
              <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

