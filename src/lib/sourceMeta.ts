import type { FontSource } from '../api/types';

/**
 * UI metadata for each font source. Centralized here so cards, detail pages,
 * sidebar nav, and filter chips never disagree about label, color, or the
 * license context for a given source.
 */
export interface SourceMeta {
  /** Short label shown in chips on cards and detail pages. */
  label: string;
  /** Longer, marketing-friendly name used in headings and filter copy. */
  longLabel: string;
  /** Tailwind classes for the chip background + text. */
  chip: string;
  /** Licensing context shown in a secondary chip / tooltip. */
  license: string;
  /** Whether TypeStack can activate/deactivate this source via CoreText. */
  activatable: boolean;
}

export const SOURCE_META: Record<FontSource, SourceMeta> = {
  local: {
    label: 'Owned',
    longLabel: 'Owned / Local',
    chip: 'bg-zinc-200/80 text-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300',
    license: 'Owned by the team — yours to use.',
    activatable: true,
  },
  adobe: {
    label: 'Adobe',
    longLabel: 'Adobe Fonts',
    chip: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    license: 'Licensed via Adobe Creative Cloud subscription. Preview only in TypeStack.',
    activatable: false,
  },
  google: {
    label: 'Google',
    longLabel: 'Google Fonts',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    license: 'Open-source via Google Fonts. Free for any use.',
    activatable: true,
  },
  system: {
    label: 'Mac OS',
    longLabel: 'Mac OS System',
    chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
    license: 'Bundled with macOS. Always available — no activation needed.',
    activatable: false,
  },
  'user-installed': {
    label: 'Font Book',
    longLabel: 'Locally Installed (Font Book)',
    chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    license: 'Installed on your Mac via Font Book. Auto-activated by the OS.',
    activatable: false,
  },
};

export function sourceLabel(source: FontSource): string {
  return SOURCE_META[source].label;
}

export function sourceChipClass(source: FontSource): string {
  return SOURCE_META[source].chip;
}

export function sourceLicense(source: FontSource): string {
  return SOURCE_META[source].license;
}

export function isActivatable(source: FontSource): boolean {
  return SOURCE_META[source].activatable;
}
