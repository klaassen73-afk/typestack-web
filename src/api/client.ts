import { useAuthStore } from '../stores/authStore';

/**
 * Where the TypeStack API actually lives.
 *
 * - In development the Vite proxy forwards `/api` to `http://localhost:3001`.
 * - In a Vercel preview the `vercel.json` rewrites `/api/*` to the configured
 *   API origin (set via the `TYPESTACK_API_BASE` env var on the project).
 * - For unusual hosting (CDN-only, different origin) `VITE_API_BASE` can be
 *   baked in at build time and the client will hit that absolute URL.
 *
 * Default is the relative `/api` so the most common shape (same-origin
 * deployment behind a reverse proxy) "just works".
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiOptions extends RequestInit {
  raw?: boolean; // skip JSON parsing (for binary downloads)
}

async function buildError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    const e = body?.error ?? {};
    return new ApiError(res.status, e.code ?? 'UNKNOWN', e.message ?? res.statusText, e.details);
  } catch {
    return new ApiError(res.status, 'UNKNOWN', res.statusText);
  }
}

async function attemptRefresh(): Promise<boolean> {
  const state = useAuthStore.getState();
  if (!state.refreshToken) return false;
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: state.refreshToken, machineId: state.machineId }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    state.setSession(data);
    return true;
  } catch {
    return false;
  }
}

export async function api<T>(path: string, init: ApiOptions = {}): Promise<T> {
  const { raw, ...rest } = init;
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(rest.headers);
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  if (rest.body && !headers.has('Content-Type') && typeof rest.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      const retryHeaders = new Headers(rest.headers);
      retryHeaders.set('Authorization', `Bearer ${useAuthStore.getState().accessToken}`);
      if (rest.body && !retryHeaders.has('Content-Type') && typeof rest.body === 'string') {
        retryHeaders.set('Content-Type', 'application/json');
      }
      res = await fetch(`${API_BASE}${path}`, { ...rest, headers: retryHeaders });
    } else {
      useAuthStore.getState().clearSession();
      throw await buildError(res);
    }
  }

  if (!res.ok) throw await buildError(res);
  if (raw) return res as unknown as T;
  return res.json() as Promise<T>;
}

// <img src=…> can't set Authorization headers, so attach the access token as
// a query param. The server's authenticate middleware accepts both.
function buildUrl(base: string, params: Record<string, string | number>): string {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  );
  const token = useAuthStore.getState().accessToken;
  if (token) qs.set('token', token);
  const s = qs.toString();
  return s ? `${base}?${s}` : base;
}

export function fontPreviewUrl(fontId: string, params: Record<string, string | number> = {}): string {
  return buildUrl(`/api/fonts/${fontId}/preview`, params);
}

export function waterfallUrl(fontId: string, params: Record<string, string | number> = {}): string {
  return buildUrl(`/api/fonts/waterfall/${fontId}`, params);
}
