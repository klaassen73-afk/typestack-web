import { api } from './client';
import type { IntegrationStatus } from './types';

export function getGoogleStatus(): Promise<IntegrationStatus> {
  return api(`/integrations/google/status`);
}

export function getAdobeStatus(): Promise<IntegrationStatus> {
  return api(`/integrations/adobe/status`);
}

export function triggerGoogleSync(limit?: number): Promise<{
  status: string;
  jobId: string;
  progressUrl: string;
}> {
  return api(`/integrations/google/sync`, {
    method: 'POST',
    body: JSON.stringify(limit ? { limit } : {}),
  });
}
