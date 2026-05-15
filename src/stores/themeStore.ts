import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AccentColor =
  | 'brand'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'graphite';

export const ACCENT_OPTIONS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'brand',    label: 'Pinnacle Red', hex: '#EA0029' },
  { id: 'blue',     label: 'Blue',         hex: '#3b82f6' },
  { id: 'purple',   label: 'Purple',       hex: '#a855f7' },
  { id: 'pink',     label: 'Pink',         hex: '#ec4899' },
  { id: 'red',      label: 'Cherry',       hex: '#ef4444' },
  { id: 'orange',   label: 'Orange',       hex: '#f97316' },
  { id: 'yellow',   label: 'Yellow',       hex: '#eab308' },
  { id: 'green',    label: 'Green',        hex: '#22c55e' },
  { id: 'graphite', label: 'Graphite',     hex: '#71717a' },
];

interface ThemeState {
  preference: ThemePreference;
  accent: AccentColor;
  setPreference: (p: ThemePreference) => void;
  setAccent: (a: AccentColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      accent: 'brand',
      setPreference: (preference) => set({ preference }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'typestack-theme' },
  ),
);

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

/**
 * Apply theme class and accent attribute to <html>. Call once at app start.
 */
export function useApplyTheme(): void {
  const preference = useThemeStore((s) => s.preference);
  const accent = useThemeStore((s) => s.accent);
  useEffect(() => {
    const apply = (): void => {
      const theme = resolveTheme(preference);
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.dataset.accent = accent;
    };
    apply();
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [preference, accent]);
}

/** Reactive hook for the currently-applied theme (resolves 'system' to OS). */
export function useIsDark(): boolean {
  const preference = useThemeStore((s) => s.preference);
  const [isDark, setIsDark] = useState<boolean>(() => resolveTheme(preference) === 'dark');
  useEffect(() => {
    const update = (): void => setIsDark(resolveTheme(preference) === 'dark');
    update();
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [preference]);
  return isDark;
}
