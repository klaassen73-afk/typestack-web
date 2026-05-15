import { api } from './client';

export function listFavorites(): Promise<{ data: string[] }> {
  return api('/favorites');
}

export function starFont(fontId: string): Promise<{ success: true; added: boolean }> {
  return api(`/favorites/${fontId}`, { method: 'PUT' });
}

export function unstarFont(fontId: string): Promise<{ success: true }> {
  return api(`/favorites/${fontId}`, { method: 'DELETE' });
}
