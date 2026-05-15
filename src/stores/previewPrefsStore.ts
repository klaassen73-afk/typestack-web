import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_PREVIEW_TEXT = 'The quick brown fox jumps over the lazy dog.';
export const DEFAULT_PREVIEW_SIZE = 48;

interface PreviewPrefsState {
  text: string;
  size: number;
  setText: (text: string) => void;
  setSize: (size: number) => void;
  resetText: () => void;
}

export const usePreviewPrefs = create<PreviewPrefsState>()(
  persist(
    (set) => ({
      text: DEFAULT_PREVIEW_TEXT,
      size: DEFAULT_PREVIEW_SIZE,
      setText: (text) => set({ text }),
      setSize: (size) => set({ size: Math.min(120, Math.max(8, Math.round(size))) }),
      resetText: () => set({ text: DEFAULT_PREVIEW_TEXT }),
    }),
    { name: 'typestack:preview-prefs' },
  ),
);
