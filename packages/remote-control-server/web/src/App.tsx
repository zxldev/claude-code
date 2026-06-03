import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { IdentityPanel } from './components/IdentityPanel';
import { ThemeProvider } from './lib/theme';
import { setAccessToken, setUserId, apiBind } from './api/client';
import { ACPDirectView } from './components/ACPDirectView';
import { AuthProvider, useAuth } from './auth/context';
import { useAuthProvider } from './auth/useAuth';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const SessionDetail = lazy(() => import('./pages/SessionDetail').then(m => ({ default: m.SessionDetail })));

function AppContent() {
  const auth = useAuth();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [acpDirect, setAcpDirect] = useState<{ url: string; token: string } | null>(null);

  // Sync auth state to API client
  useEffect(() => {
    setAccessToken(auth.accessToken);
    setUserId(auth.userId);
  }, [auth.accessToken, auth.userId]);

  // Simple hash-based router
  const parseRoute = useCallback(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    // Check for ACP direct connection (?acp=1)
    const acpParam = params.get('acp');
    if (acpParam === '1') {
      const stored = sessionStorage.getItem('acp_connection');
      if (stored) {
        try {
          const acpData = JSON.parse(stored);
          if (acpData.url && acpData.token) {
            setAcpDirect({ url: acpData.url, token: acpData.token });
            sessionStorage.removeItem('acp_connection');
            const url = new URL(window.location.href);
            url.searchParams.delete('acp');
            window.history.replaceState(null, '', url);
            return;
          }
        } catch {
          sessionStorage.removeItem('acp_connection');
        }
      }
    }

    // Check for CLI session bind (?sid=xxx)
    const sid = params.get('sid');
    if (sid) {
      const url = new URL(window.location.href);
      url.searchParams.delete('sid');
      window.history.replaceState(null, '', `/code/${sid}`);
      setCurrentSessionId(sid);
      apiBind(sid).catch((err: unknown) => {
        console.warn('Failed to bind session:', err);
      });
      return;
    }

    // Path-based routing: /code/session_xxx → session detail
    const match = path.match(/^\/code\/([^/]+)/);
    if (match && match[1]) {
      setCurrentSessionId(match[1]);
    } else {
      setCurrentSessionId(null);
    }
  }, []);

  useEffect(() => {
    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, [parseRoute]);

  const navigateToSession = useCallback((sessionId: string) => {
    window.history.pushState(null, '', `/code/${sessionId}`);
    setCurrentSessionId(sessionId);
  }, []);

  const navigateToDashboard = useCallback(() => {
    window.history.pushState(null, '', '/code/');
    setCurrentSessionId(null);
    setAcpDirect(null);
  }, []);

  // Auto-redirect to OIDC login when not authenticated
  useEffect(() => {
    if (auth.mode === 'oidc' && !auth.isAuthenticated && !auth.isLoading && !auth.error) {
      auth.login();
    }
  }, [auth.mode, auth.isAuthenticated, auth.isLoading, auth.error, auth.login]);

  // Loading state
  if (auth.isLoading) {
    return (
      <ThemeProvider defaultTheme="system">
        <div className="flex h-screen items-center justify-center bg-surface-0">
          <div className="animate-spin h-8 w-8 border-2 border-brand border-t-transparent rounded-full" />
        </div>
      </ThemeProvider>
    );
  }

  // OIDC guard: block Dashboard rendering until authenticated
  if (auth.mode === 'oidc' && !auth.isAuthenticated) {
    return (
      <ThemeProvider defaultTheme="system">
        <div className="flex h-screen items-center justify-center bg-surface-0">
          <div className="text-center space-y-4">
            <svg width="40" height="40" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="mx-auto">
              <path d="M10 1L12.2 7.8L19 10L12.2 12.2L10 19L7.8 12.2L1 10L7.8 7.8L10 1Z" fill="var(--color-brand)" />
            </svg>
            <h1 className="font-display text-2xl font-semibold text-text-primary">Remote Control</h1>
            {auth.error ? (
              <>
                <p className="text-red-500 text-sm max-w-md">Authentication error: {auth.error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-light transition-colors"
                >
                  Retry
                </button>
              </>
            ) : (
              <p className="text-text-muted text-sm">Redirecting to login...</p>
            )}
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="system">
      <div className="flex h-screen flex-col bg-surface-0 text-text-primary">
        <Navbar
          onIdentityClick={() => setIdentityOpen(true)}
          displayName={auth.displayName || undefined}
          sessionTitle={currentSessionId || (acpDirect ? 'ACP' : undefined)}
          onBack={currentSessionId || acpDirect ? navigateToDashboard : undefined}
          onLogout={auth.mode === 'oidc' ? auth.logout : undefined}
        />

        <Suspense fallback={<div className="flex flex-1 items-center justify-center text-text-muted">Loading...</div>}>
          {acpDirect ? (
            <ACPDirectView url={acpDirect.url} token={acpDirect.token} onBack={navigateToDashboard} />
          ) : currentSessionId ? (
            <SessionDetail key={currentSessionId} sessionId={currentSessionId} />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <Dashboard onNavigateSession={navigateToSession} />
            </div>
          )}
        </Suspense>

        <IdentityPanel open={identityOpen} onClose={() => setIdentityOpen(false)} />
      </div>
    </ThemeProvider>
  );
}

export default function App() {
  const authValue = useAuthProvider();
  return (
    <AuthProvider value={authValue}>
      <AppContent />
    </AuthProvider>
  );
}
