import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActivationState } from '../api/activation';
import { getMe } from '../api/auth';
import { useAuthStore, isElectron } from '../stores/authStore';
import { useIsDark } from '../stores/themeStore';
import WelcomeModal from './WelcomeModal';
import wordmarkBlack from '../assets/wordmark-black.png';
import wordmarkWhite from '../assets/wordmark-white.png';
import keyIcon from '../assets/key-icon.png';

interface DesktopBridge {
  resync?: () => Promise<{ started: boolean; bridgeAvailable: boolean }>;
  onResyncComplete?: (cb: () => void) => () => void;
}
function getDesktopBridge(): DesktopBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { typestack?: DesktopBridge }).typestack;
}

// macOS hiddenInset windows need a drag strip above the nav so the traffic
// lights have room. Electron honours `-webkit-app-region: drag` here, and
// the close/min/max buttons remain clickable through it.
const DRAG_REGION_STYLE = { WebkitAppRegion: 'drag' } as React.CSSProperties;

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isDark = useIsDark();
  const inElectron = isElectron();
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [resyncing, setResyncing] = useState(false);

  // Re-fetch the current user once on mount. Persisted authStore data from a
  // pre-existing session may lack `onboardedAt`, so this keeps the welcome
  // modal accurate after server-side schema changes.
  useEffect(() => {
    getMe().then(setUser).catch(() => undefined);
  }, [setUser]);
  // Re-uses the same key the Activation page polls on, so this is free.
  const activationQ = useQuery({
    queryKey: ['activation', 'state'],
    queryFn: getActivationState,
    refetchInterval: 10_000,
    enabled: !!useAuthStore.getState().accessToken,
  });
  const currentAutoApp = activationQ.data?.currentAutoApp ?? null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // When the desktop's resync flow finishes (after polling activation + Adobe
  // scan + sync heartbeat), refresh the renderer's cached lists so the UI
  // reflects whatever changed server-side.
  useEffect(() => {
    const bridge = getDesktopBridge();
    if (!bridge?.onResyncComplete) return;
    return bridge.onResyncComplete(() => {
      qc.invalidateQueries({ queryKey: ['fonts'] });
      qc.invalidateQueries({ queryKey: ['fonts', 'families'] });
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      qc.invalidateQueries({ queryKey: ['integrations'] });
    });
  }, [qc]);

  const handleResync = async () => {
    setResyncing(true);
    try {
      const bridge = getDesktopBridge();
      if (bridge?.resync) {
        // Desktop path — main process does the heavy lifting (Adobe scan,
        // activation poll, sync heartbeat) and emits resync-complete which
        // the effect above turns into cache invalidations.
        await bridge.resync();
      } else {
        // Web-only path — just refetch everything we display.
        await Promise.all([
          qc.invalidateQueries({ queryKey: ['fonts'] }),
          qc.invalidateQueries({ queryKey: ['fonts', 'families'] }),
          qc.invalidateQueries({ queryKey: ['collections'] }),
          qc.invalidateQueries({ queryKey: ['activation', 'state'] }),
          qc.invalidateQueries({ queryKey: ['integrations'] }),
        ]);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[resync] failed', err);
    } finally {
      setResyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <WelcomeModal />
      <header className="sticky top-0 z-20 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/55 supports-[backdrop-filter]:dark:bg-zinc-950/55">
        {inElectron && (
          <div
            className="h-7 w-full bg-transparent"
            style={DRAG_REGION_STYLE}
            aria-hidden="true"
          />
        )}
        <div className="h-14 flex items-stretch">
          {/* Brand mark — square flush to the left edge of the viewport, fills the full header height. */}
          <NavLink
            to="/fonts"
            aria-label="TypeStack"
            title="TypeStack"
            className="w-14 shrink-0 bg-accent flex items-center justify-center p-2 hover:brightness-110 transition-[filter]"
          >
            <img
              src={keyIcon}
              alt=""
              className="h-full w-full object-contain select-none"
              draggable={false}
            />
          </NavLink>
          <NavLink to="/fonts" className="flex items-center px-4 shrink-0" aria-label="TypeStack — home">
            <img
              src={isDark ? wordmarkWhite : wordmarkBlack}
              alt="type stack"
              className="h-5 w-auto select-none"
              draggable={false}
            />
          </NavLink>
          <nav className="flex items-center gap-0.5">
            <NavItem to="/fonts">Fonts</NavItem>
            <NavItem to="/libraries">Libraries</NavItem>
            <NavItem to="/activation">Activation</NavItem>
            <NavItem to="/missing">Find missing</NavItem>
            {user?.role === 'admin' && <NavItem to="/admin">Admin</NavItem>}
          </nav>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-sm pr-6">
            {currentAutoApp && (
              <NavLink
                to="/activation"
                title={`Temporary auto-activation triggered by ${currentAutoApp.appName}. Click to see active fonts.`}
                className="h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs bg-accent/10 text-accent hover:bg-accent/15 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse"
                />
                <span className="truncate max-w-[160px]">
                  Auto · {currentAutoApp.appName}
                </span>
              </NavLink>
            )}
            <button
              type="button"
              onClick={() => {
                // Synthesize a ⌘K so the global listener in CommandPalette opens it.
                window.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
                );
              }}
              title="Open command palette (⌘K)"
              className="h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
            >
              <SearchKbdIcon />
              <kbd className="border border-zinc-300 dark:border-zinc-700 rounded px-1 text-[10px] leading-none py-0.5">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={handleResync}
              disabled={resyncing}
              className="h-8 px-3 rounded-full text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70 disabled:opacity-50 transition-colors"
              title="Re-pull activation state, scan Adobe Fonts cache, refresh libraries"
            >
              {resyncing ? 'Resyncing…' : 'Resync'}
            </button>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `h-8 w-8 grid place-items-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-zinc-200 dark:bg-zinc-800'
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/70'
                }`
              }
              aria-label="Settings"
              title="Settings"
            >
              <span className="text-base leading-none">⚙</span>
            </NavLink>
            <span className="text-zinc-600 dark:text-zinc-400">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SearchKbdIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <circle cx="5.5" cy="5.5" r="3.5" />
      <path d="M8.5 8.5l3 3" strokeLinecap="round" />
    </svg>
  );
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-3 py-1.5 rounded-full text-sm transition-colors ${
          isActive
            ? 'bg-zinc-900/5 text-zinc-900 dark:bg-zinc-100/10 dark:text-zinc-100'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/[0.03] dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-100/[0.06]'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
