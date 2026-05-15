import { api } from './client';
import { useAuthStore } from '../stores/authStore';
import type { ActivationEvent, ActivationMode, ActivationState } from './types';

export function getActivationState(): Promise<ActivationState> {
  return api(`/activation/state`);
}

export function activateFonts(
  fontIds: string[],
  mode: ActivationMode = 'permanent',
): Promise<{
  activated: string[];
  state: ActivationState;
}> {
  return api(`/activation/activate`, {
    method: 'POST',
    body: JSON.stringify({ fontIds, mode }),
  });
}

export function deactivateFonts(fontIds: string[]): Promise<{
  deactivated: string[];
  state: ActivationState;
}> {
  return api(`/activation/deactivate`, {
    method: 'POST',
    body: JSON.stringify({ fontIds }),
  });
}

export function clearTemporaryActivations(): Promise<{
  cleared: string[];
  state: ActivationState;
}> {
  return api(`/activation/clear-temporary`, { method: 'POST' });
}

export function syncActivation(): Promise<{ state: ActivationState; syncedAt: string }> {
  const { machineId } = useAuthStore.getState();
  return api(`/activation/sync`, {
    method: 'POST',
    body: JSON.stringify({
      machineId,
      clientVersion: '0.1.0',
      platform: 'web',
    }),
  });
}

export function listActivationHistory(limit = 100): Promise<{ data: ActivationEvent[] }> {
  return api(`/activation/history?limit=${limit}`);
}
