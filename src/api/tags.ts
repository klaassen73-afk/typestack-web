import { api } from './client';

export interface TagUsage {
  tag: string;
  count: number;
}

export function listTags(): Promise<{ data: TagUsage[] }> {
  return api('/tags');
}

export function addFontTag(fontId: string, tag: string): Promise<{ fontId: string; tags: string[] }> {
  return api(`/tags/font/${fontId}`, {
    method: 'POST',
    body: JSON.stringify({ tag }),
  });
}

export function removeFontTag(fontId: string, tag: string): Promise<{ fontId: string; tags: string[] }> {
  return api(`/tags/font/${fontId}/${encodeURIComponent(tag)}`, { method: 'DELETE' });
}
