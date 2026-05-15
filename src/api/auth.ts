import { api } from './client';
import type { PublicUser } from './types';

export function getMe(): Promise<PublicUser> {
  return api('/auth/me');
}

export function markOnboarded(): Promise<PublicUser> {
  return api('/auth/onboarded', { method: 'POST' });
}
