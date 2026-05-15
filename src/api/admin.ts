import { api } from './client';
import type { AdminStats, Collection, PublicUser, UserRole } from './types';

export type LibraryAccessRelation = 'owner' | 'member' | 'none';

export interface UserLibraryAccessRow {
  collection: Collection;
  relation: LibraryAccessRelation;
}

export function getUserLibraryAccess(
  userId: string,
): Promise<{ userId: string; rows: UserLibraryAccessRow[] }> {
  return api(`/admin/users/${userId}/library-access`);
}

export function grantUserLibraryAccess(
  userId: string,
  collectionId: string,
): Promise<{ success: true; added: boolean }> {
  return api(`/admin/users/${userId}/library-access`, {
    method: 'POST',
    body: JSON.stringify({ collectionId }),
  });
}

export function revokeUserLibraryAccess(
  userId: string,
  collectionId: string,
): Promise<{ success: true }> {
  return api(`/admin/users/${userId}/library-access/${collectionId}`, { method: 'DELETE' });
}

export function listAdminUsers(): Promise<{ data: PublicUser[] }> {
  return api(`/admin/users`);
}

export function createAdminUser(input: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
}): Promise<PublicUser> {
  return api(`/admin/users`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateAdminUser(
  id: string,
  input: { name?: string; role?: UserRole; password?: string },
): Promise<PublicUser> {
  return api(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteAdminUser(id: string): Promise<{ success: true }> {
  return api(`/admin/users/${id}`, { method: 'DELETE' });
}

export function getAdminStats(): Promise<AdminStats> {
  return api(`/admin/stats`);
}
