import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listFontFamilies } from '../api/fonts';
import { listCollections } from '../api/collections';
import { useAuthStore } from '../stores/authStore';
import { sourceLabel, sourceChipClass } from '../lib/sourceMeta';

/**
 * Cmd+K global command palette. Fuzzy-jump to a font family, a library, or a
 * top-level action without leaving the keyboard. Open with ⌘K / Ctrl+K, close
 * with Esc. Arrow keys + Enter navigate.
 *
 * Mounted globally from <Layout/> so it works on every authenticated page.
 */

type Result =
  | { kind: 'font'; id: string; label: string; sublabel: string; source: string }
  | { kind: 'library'; id: string; label: string; sublabel: string }
  | { kind: 'action'; label: string; sublabel: string; path: string; shortcut?: string };

const STATIC_ACTIONS: Result[] = [
  { kind: 'action', label: 'Browse fonts',        sublabel: 'Open the All Fonts grid',         path: '/fonts' },
  { kind: 'action', label: 'Libraries',           sublabel: 'Manage your team libraries',      path: '/libraries' },
  { kind: 'action', label: 'Activation history',  sublabel: 'See what was activated and when', path: '/activation' },
  { kind: 'action', label: 'Settings',            sublabel: 'Theme, accent, preview defaults', path: '/settings' },
];

const ADMIN_ACTIONS: Result[] = [
  { kind: 'action', label: 'Admin panel',         sublabel: 'Users, integrations, stats',      path: '/admin' },
];

export default function CommandPalette() {
  const role = useAuthStore((s) => s.user?.role);
  const accessToken = useAuthStore((s) => s.accessToken);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open on ⌘K / Ctrl+K, close on Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmd = e.metaKey || e.ctrlKey;
      if (isCmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset state on close, focus on open.
  useEffect(() => {
    if (open) {
      setQ('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const enabled = open && !!accessToken;
  const fontsQ = useQuery({
    queryKey: ['palette', 'fonts', q],
    queryFn: () => listFontFamilies({ page: 1, pageSize: 8, search: q || undefined, sort: 'name' }),
    enabled,
    placeholderData: (prev) => prev,
  });
  const libsQ = useQuery({
    queryKey: ['palette', 'collections'],
    queryFn: listCollections,
    enabled,
  });

  const results = useMemo<Result[]>(() => {
    const out: Result[] = [];
    const term = q.trim().toLowerCase();

    // Fonts come first when the user is actually searching for something.
    for (const f of fontsQ.data?.data ?? []) {
      out.push({
        kind: 'font',
        id: f.primaryId,
        label: f.familyName,
        sublabel: `${f.variantCount} ${f.variantCount === 1 ? 'style' : 'styles'}`,
        source: f.source,
      });
    }

    const libs = (libsQ.data?.data ?? []).filter((c) =>
      !term || c.name.toLowerCase().includes(term),
    );
    for (const c of libs.slice(0, 6)) {
      out.push({
        kind: 'library',
        id: c.id,
        label: c.name,
        sublabel: `${c.fontCount.toLocaleString()} fonts`,
      });
    }

    const actions = [...STATIC_ACTIONS, ...(role === 'admin' ? ADMIN_ACTIONS : [])].filter(
      (a) =>
        !term ||
        a.label.toLowerCase().includes(term) ||
        a.sublabel.toLowerCase().includes(term),
    );
    out.push(...actions);

    return out;
  }, [fontsQ.data, libsQ.data, q, role]);

  // Keep cursor in range after results change.
  useEffect(() => {
    if (cursor >= results.length) setCursor(Math.max(0, results.length - 1));
  }, [results.length, cursor]);

  const onSelect = (r: Result) => {
    setOpen(false);
    if (r.kind === 'font') navigate(`/fonts/${r.id}`);
    else if (r.kind === 'library') navigate(`/libraries/${r.id}`);
    else navigate(r.path);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[cursor];
      if (r) onSelect(r);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[55] bg-zinc-900/40 backdrop-blur-sm flex items-start justify-center p-6 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
          <span className="text-zinc-500" aria-hidden="true">⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Jump to a font, library, or page…"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-zinc-500"
            aria-label="Command palette query"
          />
          <kbd className="text-[10px] uppercase tracking-wider text-zinc-500 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {results.length === 0 && (
            <li className="px-4 py-6 text-sm text-zinc-500 text-center">No matches.</li>
          )}
          {results.map((r, i) => (
            <li key={`${r.kind}:${r.kind === 'action' ? r.path : r.id}`}>
              <button
                onMouseEnter={() => setCursor(i)}
                onClick={() => onSelect(r)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 ${
                  i === cursor
                    ? 'bg-zinc-100 dark:bg-zinc-800/60'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 w-14 shrink-0">
                  {r.kind === 'font' ? 'Font' : r.kind === 'library' ? 'Library' : 'Go to'}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm truncate">{r.label}</span>
                  <span className="block text-xs text-zinc-500 truncate">{r.sublabel}</span>
                </span>
                {r.kind === 'font' && (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${sourceChipClass(r.source as never)}`}
                  >
                    {sourceLabel(r.source as never)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>
            <kbd className="border border-zinc-300 dark:border-zinc-700 rounded px-1">↑↓</kbd> to
            navigate · <kbd className="border border-zinc-300 dark:border-zinc-700 rounded px-1">↵</kbd> to
            open
          </span>
          <span>
            <kbd className="border border-zinc-300 dark:border-zinc-700 rounded px-1">⌘K</kbd> any
            time
          </span>
        </div>
      </div>
    </div>
  );
}
