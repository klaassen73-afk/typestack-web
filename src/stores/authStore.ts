import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, PublicUser } from '../api/types';
import { getMachineId } from '../lib/machineId';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: PublicUser | null;
  machineId: string;
  setSession: (tokens: AuthTokens) => void;
  setUser: (user: PublicUser) => void;
  clearSession: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// When the web is loaded inside the Electron desktop client, the preload
// script exposes window.typestack. We forward auth changes so the main
// process's polling loop keeps a valid token.
interface ElectronBridge {
  setSession: (
    s: { accessToken: string; refreshToken: string; machineId: string } | null,
  ) => Promise<void>;
}
function getElectronBridge(): ElectronBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { typestack?: ElectronBridge }).typestack;
}

function forwardToElectron(
  payload: { accessToken: string; refreshToken: string; machineId: string } | null,
): void {
  const bridge = getElectronBridge();
  if (bridge?.setSession) bridge.setSession(payload).catch(() => undefined);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      machineId: getMachineId(),
      setSession: (tokens) => {
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: tokens.user,
        });
        forwardToElectron({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          machineId: get().machineId,
        });
      },
      setUser: (user) => set({ user }),
      clearSession: () => {
        set({ accessToken: null, refreshToken: null, user: null });
        forwardToElectron(null);
      },
      login: async (email, password) => {
        const res = await fetch('https://api.xxxspeedxxx.com/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, machineId: get().machineId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message ?? 'Login failed');
        }
        const tokens = (await res.json()) as AuthTokens;
        get().setSession(tokens);
      },
      logout: async () => {
        const refreshToken = get().refreshToken;
        if (refreshToken) {
          await fetch('https://api.xxxspeedxxx.com/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }).catch(() => undefined);
        }
        get().clearSession();
      },
    }),
    {
      name: 'typestack-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
        machineId: s.machineId,
      }),
    },
  ),
);

/** True when the web is running inside the TypeStack desktop client. */
export function isElectron(): boolean {
  return !!getElectronBridge();
}

/** Trigger the desktop client to copy selected fonts to ~/Desktop/Collected/. */
export async function collectFontsToDesktop(
  fontIds: string[],
  folderName?: string,
): Promise<{ folder: string; copied: number; failed: Array<{ fontId: string; reason: string }> }> {
  const bridge = (window as unknown as {
    typestack?: {
      collectFontsToDesktop: (o: { fontIds: string[]; folderName?: string }) => Promise<{
        folder: string;
        copied: number;
        failed: Array<{ fontId: string; reason: string }>;
      }>;
    };
  }).typestack;
  if (!bridge?.collectFontsToDesktop) {
    throw new Error('Collect-to-Desktop is only available in the desktop client');
  }
  return bridge.collectFontsToDesktop({ fontIds, folderName });
}
