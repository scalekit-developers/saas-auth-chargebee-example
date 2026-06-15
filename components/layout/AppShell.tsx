import Link from 'next/link';
import LogoutButton from '@/components/LogoutButton';

export type AppShellActive =
  | 'guide'
  | 'dashboard'
  | 'billing'
  | 'sessions'
  | 'login'
  | 'organization';

type AppShellProps = {
  children: React.ReactNode;
  active?: AppShellActive;
  userEmail?: string;
};

function navClass(isActive: boolean): string {
  return `nav-link${isActive ? ' active' : ''}`;
}

export default function AppShell({ children, active, userEmail }: AppShellProps) {
  const homeHref = userEmail ? '/guide' : '/';

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand" href={homeHref}>
            Scalekit + Chargebee
          </Link>
          <div className="navbar-nav ms-auto align-items-lg-center">
            {userEmail ? (
              <>
                <span className="navbar-text me-3 d-none d-lg-inline text-white-50 small">
                  {userEmail}
                </span>
                <Link className={navClass(active === 'guide')} href="/guide">
                  Guide
                </Link>
                <Link className={navClass(active === 'dashboard')} href="/dashboard">
                  Dashboard
                </Link>
                <Link className={navClass(active === 'billing')} href="/billing">
                  Billing
                </Link>
                <Link className={navClass(active === 'sessions')} href="/sessions">
                  Sessions
                </Link>
                <LogoutButton />
              </>
            ) : (
              <Link className={navClass(active === 'login')} href="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>

      {children}

      <footer className="border-top mt-5 py-4">
        <div className="container text-center text-muted small">
          Reference app for B2B SaaS billing — source in{' '}
          <code>ecosystem/chargebee</code>
        </div>
      </footer>
    </>
  );
}