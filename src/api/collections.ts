import { api } from './client';
import { useAuthStore } from '../stores/authStore';
import type { Collection, CollectionWithFonts, OutputProfile } from './types';

export function listCollections(): Promise<{ data: Collection[] }> {
  return api(`/collections`);
}

export function getCollection(id: string): Promise<CollectionWithFonts> {
  return api(`/collections/${id}`);
}

export function createCollection(input: {
  name: string;
  description?: string | null;
  outputProfile?: OutputProfile | null;
}): Promise<Collection> {
  return api(`/collections`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateCollection(
  id: string,
  input: { name?: string; description?: string | null; outputProfile?: OutputProfile | null },
): Promise<Collection> {
  return api(`/collections/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteCollection(id: string): Promise<{ success: true }> {
  return api(`/collections/${id}`, { method: 'DELETE' });
}

export function addFontToCollection(
  collectionId: string,
  fontId: string,
): Promise<{ success: true; added: boolean }> {
  return api(`/collections/${collectionId}/fonts`, {
    method: 'POST',
    body: JSON.stringify({ fontId }),
  });
}

export function removeFontFromCollection(
  collectionId: string,
  fontId: string,
): Promise<{ success: true }> {
  return api(`/collections/${collectionId}/fonts/${fontId}`, { method: 'DELETE' });
}

export function exportCollection(id: string, format: 'json' | 'css' | 'zip' = 'json'): string {
  // <a href=…> downloads can't set Authorization headers; the server's
  // authenticate middleware accepts ?token= as a fallback.
  const token = useAuthStore.getState().accessToken;
  const qs = new URLSearchParams({ format });
  if (token) qs.set('token', token);
  return `/api/collections/${id}/export?${qs.toString()}`;
}

export function activateCollection(
  id: string,
  appName?: string,
): Promise<{ collectionId: string; activated: string[] }> {
  return api(`/collections/${id}/activate`, {
    method: 'POST',
    body: JSON.stringify({ appName: appName ?? null }),
  });
}

export function deactivateCollection(
  id: string,
): Promise<{ collectionId: string; deactivated: string[] }> {
  return api(`/collections/${id}/deactivate`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export interface CollectionMember {
  userId: string;
  email: string;
  name: string;
  addedAt: string;
}

export function listCollectionMembers(
  id: string,
): Promise<{ ownerUserId: string | null; members: CollectionMember[] }> {
  return api(`/collections/${id}/members`);
}

export function addCollectionMember(
  id: string,
  email: string,
): Promise<{ success: true; added: boolean; note?: string; member: CollectionMember }> {
  return api(`/collections/${id}/members`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function removeCollectionMember(
  id: string,
  userId: string,
): Promise<{ success: true }> {
  return api(`/collections/${id}/members/${userId}`, { method: 'DELETE' });
}
