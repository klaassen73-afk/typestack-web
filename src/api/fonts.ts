import { api } from './client';
import type {
  FamilyGroup,
  Font,
  FontsListQuery,
  ImportJob,
  PaginatedResponse,
} from './types';

function fontsQs(q: FontsListQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  return params.toString();
}

export function listFonts(q: FontsListQuery): Promise<PaginatedResponse<Font>> {
  return api<PaginatedResponse<Font>>(`/fonts?${fontsQs(q)}`);
}

export function listFontFamilies(q: FontsListQuery): Promise<PaginatedResponse<FamilyGroup>> {
  return api<PaginatedResponse<FamilyGroup>>(`/fonts/families?${fontsQs(q)}`);
}

export function getFont(id: string): Promise<Font> {
  return api<Font>(`/fonts/${id}`);
}

export function deleteFont(id: string): Promise<{ success: true }> {
  return api(`/fonts/${id}`, { method: 'DELETE' });
}

export function importFonts(files: File[]): Promise<{
  jobId: string;
  status: string;
  fileCount: number;
  totalBytes: number;
  progressUrl: string;
}> {
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return api(`/fonts/import`, { method: 'POST', body: fd });
}

export function getImportJob(jobId: string): Promise<ImportJob | null> {
  return api<ImportJob | null>(`/fonts/import/progress/${jobId}`).catch(() => null);
}
