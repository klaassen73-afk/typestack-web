import { useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Navigate, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import FontBrowser from './pages/FontBrowser';
import FontPreview from './pages/FontPreview';
import Collections from './pages/Collections';
import Activation from './pages/Activation';
import MissingFonts from './pages/MissingFonts';
import Admin from './pages/Admin';
import Settings from './pages/Settings';
import { useApplyTheme } from './stores/themeStore';
import { useAuthStore, isElectron } from './stores/authStore';
import { clearTemporaryActivations } from './api/activation';
import ToastViewport from './components/Toast';
import CommandPalette from './components/CommandPalette';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/**
 * Proactively refresh the access token a minute before it expires. Without
 * this, `<img>` tags that embed the token in their URL (font previews) keep
 * loading with the dead token until the next React re-render — which may
 * never happen for the current viewport.
 *
 * Reads `exp` from the JWT payload (unencrypted by definition) so we don't
 * have to track expiry separately in the auth store.
 */
/** Bookmarked /collections/:id links keep working — bounce them to /libraries/:id. */
function CollectionsRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/libraries/${id}` : '/libraries'} replace />;
}

function TokenRefreshScheduler() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const machineId = useAuthStore((s) => s.machineId);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    if (!accessToken || !refreshToken) return;
    let exp: number | undefined;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1])) as { exp?: number };
      exp = payload.exp;
    } catch {
      return;
    }
    if (!exp) return;
    // Refresh halfway through the token lifetime (or 60s before expiry if the
    // lifetime is shorter), with a 10s floor to avoid firing immediately on a
    // freshly-issued token. Avoids racing api/client's on-401 refresh —
    // proactive refresh runs well before the token would 401.
    const lifetimeSec = Math.max(60, exp - Math.floor(Date.now() / 1000));
    const refreshInSec = Math.max(10, Math.min(lifetimeSec / 2, lifetimeSec - 60));
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken, machineId }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          // Refresh token is gone (rotated, revoked, or expired). Stop
          // hammering /refresh — sign the user out so they hit the login page.
          clearSession();
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSession(data);
      } catch {
        // Network blip — next 401 in api/client will retry on demand.
      }
    }, refreshInSec * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accessToken, refreshToken, machineId, setSession, clearSession]);

  return null;
}

function ClearTemporaryOnLaunch() {
  // When the desktop client launches a fresh Electron window, drop any
  // Temporary activations from the previous run so the user re-opens with
  // only their Permanent set registered. Web tabs don't trigger this —
  // Temporary state is scoped to the desktop client per project decision.
  const accessToken = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();
  useEffect(() => {
    if (!isElectron() || !accessToken) return;
    const key = 'typestack:cleared-temp-this-session';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    clearTemporaryActivations()
      .then(() => qc.invalidateQueries({ queryKey: ['activation', 'state'] }))
      .catch(() => sessionStorage.removeItem(key));
  }, [accessToken, qc]);
  return null;
}

export default function App() {
  useApplyTheme();
  return (
    <QueryClientProvider client={queryClient}>
      <TokenRefreshScheduler />
      <ClearTemporaryOnLaunch />
      <ToastViewport />
      <BrowserRouter>
        <CommandPalette />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/fonts" replace />} />
              <Route path="fonts" element={<FontBrowser />} />
              <Route path="fonts/:id" element={<FontPreview />} />
              <Route path="libraries" element={<Collections />} />
              <Route path="libraries/:id" element={<Collections />} />
              {/* Legacy /collections paths — keep working forever, but
                  navigate to the new canonical /libraries URLs. */}
              <Route path="collections" element={<Navigate to="/libraries" replace />} />
              <Route path="collections/:id" element={<CollectionsRedirect />} />
              <Route path="activation" element={<Activation />} />
              <Route path="missing" element={<MissingFonts />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute adminOnly />}>
            <Route element={<Layout />}>
              <Route path="admin" element={<Admin />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/fonts" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
