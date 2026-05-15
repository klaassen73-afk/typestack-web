import { api } from './client';
import type { Font } from './types';

export interface MissingFontMatch {
  font: Font;
  score: number;
  via: 'exact' | 'fuzzy';
}

export interface MissingFontResult {
  query: string;
  matches: MissingFontMatch[];
  best: MissingFontMatch | null;
}

export function resolveMissingFonts(names: string[]): Promise<{ data: MissingFontResult[] }> {
  return api('/missing-fonts/resolve', {
    method: 'POST',
    body: JSON.stringify({ names }),
  });
}
