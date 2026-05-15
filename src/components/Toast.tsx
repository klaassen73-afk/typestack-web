import { useEffect } from 'react';
import { create } from 'zustand';

/**
 * Minimal toast system — no external deps. Triggered from anywhere via
 * `toast.success(...)` / `toast.error(...)` / `toast.info(...)`. Auto-dismiss
 * after 4s. Rendered globally by <ToastViewport /> mounted at the app root.
 */

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastEntry {
  id: number;
  variant: ToastVariant;
  message: string;
  detail?: string;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (t: Omit<ToastEntry, 'id'>) => number;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (message: string, detail?: string) =>
    useToastStore.getState().push({ variant: 'success', message, detail }),
  error: (message: string, detail?: string) =>
    useToastStore.getState().push({ variant: 'error', message, detail }),
  info: (message: string, detail?: string) =>
    useToastStore.getState().push({ variant: 'info', message, detail }),
};

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/60 dark:text-green-100',
  error:   'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-100',
  info:    'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100',
};

function ToastItem({ entry }: { entry: ToastEntry }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const t = setTimeout(() => dismiss(entry.id), 4000);
    return () => clearTimeout(t);
  }, [entry.id, dismiss]);

  return (
    <div
      role={entry.variant === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto min-w-[260px] max-w-sm rounded-lg border shadow-lg px-4 py-3 text-sm transition-all ${variantStyles[entry.variant]}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-base leading-none mt-0.5">
          {entry.variant === 'success' ? '✓' : entry.variant === 'error' ? '✕' : '•'}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{entry.message}</div>
          {entry.detail && (
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{entry.detail}</div>
          )}
        </div>
        <button
          onClick={() => dismiss(entry.id)}
          aria-label="Dismiss"
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-base leading-none -mt-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} entry={t} />
      ))}
    </div>
  );
}
