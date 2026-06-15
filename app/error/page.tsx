'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AppShell from '@/components/layout/AppShell';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'An unknown error occurred';

  return (
    <AppShell active="login">
      <main className="container">
        <div className="error-container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
          <div className="error-card" style={{ maxWidth: '600px', width: '100%', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', border: 'none', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="error-header" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)', color: 'white', padding: '2rem', textAlign: 'center' }}>
              <div className="error-icon" style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
              <h2 className="mb-2">Authentication Error</h2>
              <p className="mb-0 opacity-75">Something went wrong during authentication</p>
            </div>
            
            <div className="card-body p-4">
              <div className="alert alert-danger" role="alert">
                <h5 className="alert-heading">Error Details</h5>
                <p className="mb-0">{error}</p>
              </div>

              <div className="mt-4">
                <h6>What can you do?</h6>
                <ul className="list-unstyled">
                  <li className="mb-2">
                    Make sure you're using the correct Scalekit credentials
                  </li>
                  <li className="mb-2">
                    Check that your redirect URI matches your Scalekit configuration
                  </li>
                  <li className="mb-2">
                    Try clearing your browser cookies and logging in again
                  </li>
                </ul>
              </div>

              <div className="d-grid gap-2 mt-4">
                <Link href="/login" className="btn btn-primary">Try Again</Link>
                <Link href="/" className="btn btn-outline-secondary">Back to Home</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
