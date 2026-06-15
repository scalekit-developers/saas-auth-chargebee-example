import { redirect } from 'next/navigation';
import { getSession, isTokenExpired } from '@/lib/cookies';
import Link from 'next/link';
import AppShell from '@/components/layout/AppShell';
import CopyButton from '@/components/CopyButton';
import { format, differenceInMinutes } from 'date-fns';
import SessionActions from '@/components/SessionActions';

export default async function SessionsPage() {
  const session = getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  const { user, tokens } = session;
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null;
  
  let minutesUntilExpiry: number | null = null;
  let isExpired = false;
  let isExpiringSoon = false;

  if (expiresAt) {
    const now = new Date();
    minutesUntilExpiry = differenceInMinutes(expiresAt, now);
    isExpired = minutesUntilExpiry < 0;
    isExpiringSoon = minutesUntilExpiry >= 0 && minutesUntilExpiry <= 5;
  }

  const userEmail = user.email ?? 'Signed in';

  return (
    <AppShell active="sessions" userEmail={userEmail}>
      <main className="container mt-4 mb-5">
        <p className="small text-muted mb-3">
          <Link href="/guide">← Guide</Link>
        </p>
        <div className="row">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h1>Session management</h1>
            </div>

            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Current Session</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>User Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>User ID:</strong></td>
                          <td>{user.sub || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Email:</strong></td>
                          <td>{user.email || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{user.name || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6>Token Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Has Access Token:</strong></td>
                          <td>
                            {tokens.access_token ? (
                              <span className="badge bg-success">Yes</span>
                            ) : (
                              <span className="badge bg-warning">No</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Has Refresh Token:</strong></td>
                          <td>
                            {tokens.refresh_token ? (
                              <span className="badge bg-success">Yes</span>
                            ) : (
                              <span className="badge bg-warning">No</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {expiresAt && (
                  <div className="mt-4">
                    <h6>Token Expiry Information</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <table className="table table-sm">
                          <tbody>
                            <tr>
                              <td><strong>Expires At:</strong></td>
                              <td>{format(expiresAt, 'yyyy-MM-dd HH:mm:ss')}</td>
                            </tr>
                            <tr>
                              <td><strong>Time Until Expiry:</strong></td>
                              <td>
                                {minutesUntilExpiry !== null ? (
                                  minutesUntilExpiry > 60 ? (
                                    `${Math.floor(minutesUntilExpiry / 60)} hours`
                                  ) : (
                                    `${minutesUntilExpiry} minutes`
                                  )
                                ) : (
                                  'N/A'
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="col-md-6">
                        <div className={`alert ${isExpired ? 'alert-danger' : isExpiringSoon ? 'alert-warning' : 'alert-success'}`}>
                          <strong>Status:</strong>
                          {isExpired ? ' Token has expired' : isExpiringSoon ? ' Token expiring soon' : ' Token is valid'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <h6>
                    <button 
                      className="btn btn-sm btn-outline-secondary" 
                      type="button" 
                      data-bs-toggle="collapse" 
                      data-bs-target="#tokenValues" 
                      aria-expanded="false"
                    >
                      <span id="tokenToggleText">Show</span> Token Values
                    </button>
                  </h6>
                  <div className="collapse" id="tokenValues">
                    <div className="card card-body bg-light mt-2">
                      {tokens.access_token && (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Access Token:</strong>
                            <CopyButton text={tokens.access_token} />
                          </div>
                          <div className="p-2 bg-white border rounded" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85em' }}>
                            {tokens.access_token}
                          </div>
                        </div>
                      )}
                      {tokens.refresh_token && (
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>Refresh Token:</strong>
                            <CopyButton text={tokens.refresh_token} />
                          </div>
                          <div className="p-2 bg-white border rounded" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85em' }}>
                            {tokens.refresh_token}
                          </div>
                        </div>
                      )}
                      {tokens.id_token && (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <strong>ID Token:</strong>
                            <CopyButton text={tokens.id_token} />
                          </div>
                          <div className="p-2 bg-white border rounded" style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.85em' }}>
                            {tokens.id_token}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mt-3">
              <div className="card-header">
                <h6 className="mb-0">Session Actions</h6>
              </div>
              <div className="card-body">
                <SessionActions />
              </div>
            </div>
          </div>
        </div>
      </main>

      <script dangerouslySetInnerHTML={{
        __html: `
          document.getElementById('tokenValues')?.addEventListener('show.bs.collapse', function() {
            document.getElementById('tokenToggleText').textContent = 'Hide';
          });
          document.getElementById('tokenValues')?.addEventListener('hide.bs.collapse', function() {
            document.getElementById('tokenToggleText').textContent = 'Show';
          });
        `
      }} />
    </AppShell>
  );
}

