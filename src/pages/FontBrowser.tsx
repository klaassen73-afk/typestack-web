import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { listFontFamilies } from '../api/fonts';
import { getCollection } from '../api/collections';
import { getActivationState, activateFonts, deactivateFonts } from '../api/activation';
import { useAuthStore } from '../stores/authStore';
import type { ActivationMode, FontsListQuery, FontCategory } from '../api/types';
import FamilyCard from '../components/FamilyCard';
import FontLibrarySidebar from '../components/FontLibrarySidebar';
import CollectionPicker from '../components/CollectionPicker';
import { FontCardSkeletonGrid } from '../components/Skeleton';
import { toast } from '../components/Toast';
import { collectFontsToDesktop, isElectron } from '../stores/authStore';
import {
  DEFAULT_PREVIEW_TEXT,
  usePreviewPrefs,
} from '../stores/previewPrefsStore';

const PAGE_SIZE = 60;

export default function FontBrowser() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Subscribing to the access token here forces every FamilyCard preview <img>
  // to re-render (and re-fetch) after a token refresh — otherwise the URL bakes
  // in the stale token and the image stays broken until the next state change.
  useAuthStore((s) => s.accessToken);
  const libraryId = searchParams.get('library') ?? undefined;
  const urlTag = searchParams.get('tag') ?? undefined;
  const [query, setQuery] = useState<FontsListQuery>({
    page: 1,
    pageSize: PAGE_SIZE,
    sort: 'name',
    collectionId: libraryId,
    tag: urlTag,
  });

  // Keep URL params in sync with the active filter. Library lives in `?library=`,
  // tag chips drive `?tag=`. Both feed into the React-Query key via `query`.
  useEffect(() => {
    setQuery((q) => ({ ...q, collectionId: libraryId, tag: urlTag, page: 1 }));
  }, [libraryId, urlTag]);

  // Fetch the library metadata so the header can render its name + manage link.
  const libraryQ = useQuery({
    queryKey: ['collection', libraryId, 'detail'],
    queryFn: () => getCollection(libraryId!),
    enabled: !!libraryId,
  });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const storedText = usePreviewPrefs((s) => s.text);
  const previewSize = usePreviewPrefs((s) => s.size);
  const setStoredText = usePreviewPrefs((s) => s.setText);
  const setPreviewSize = usePreviewPrefs((s) => s.setSize);
  const [textDraft, setTextDraft] = useState(storedText);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery((q) => ({ ...q, search: search || undefined, page: 1 }));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (textDraft !== storedText) setStoredText(textDraft);
    }, 300);
    return () => clearTimeout(t);
  }, [textDraft, storedText, setStoredText]);

  // ⌘/ (or Ctrl+/) focuses the toolbar font search. The Cmd+K palette is for
  // jumping anywhere; this is for narrowing the visible grid in place.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!showFilters && !showSort) return;
    const onClick = (e: MouseEvent) => {
      if (showFilters && filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (showSort && sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSort(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showFilters, showSort]);

  const familiesQ = useQuery({
    queryKey: ['fonts', 'families', query],
    queryFn: () => listFontFamilies(query),
    placeholderData: (prev) => prev,
  });

  const activationQ = useQuery({
    queryKey: ['activation', 'state'],
    queryFn: getActivationState,
    refetchInterval: 10_000,
  });

  const activeIds = useMemo(
    () => new Set(activationQ.data?.activeFonts.map((f) => f.fontId) ?? []),
    [activationQ.data],
  );

  const activeModes = useMemo(() => {
    const m = new Map<string, ActivationMode>();
    for (const f of activationQ.data?.activeFonts ?? []) m.set(f.fontId, f.mode);
    return m;
  }, [activationQ.data]);

  const toggleSelectFamily = (ids: string[]) =>
    setSelected((s) => {
      const next = new Set(s);
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) for (const id of ids) next.delete(id);
      else for (const id of ids) next.add(id);
      return next;
    });

  const activateFamily = async (ids: string[], mode: ActivationMode) => {
    try {
      await activateFonts(ids, mode);
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      toast.success(
        `Activated ${ids.length} ${ids.length === 1 ? 'style' : 'styles'}`,
        mode === 'temporary' ? 'Will deactivate at next launch.' : 'Available across all apps.',
      );
    } catch (err) {
      toast.error('Activation failed', err instanceof Error ? err.message : String(err));
    }
  };

  const deactivateFamily = async (ids: string[]) => {
    const toDeactivate = ids.filter((id) => activeIds.has(id));
    if (toDeactivate.length === 0) return;
    try {
      await deactivateFonts(toDeactivate);
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      toast.success(`Deactivated ${toDeactivate.length} ${toDeactivate.length === 1 ? 'style' : 'styles'}`);
    } catch (err) {
      toast.error('Deactivation failed', err instanceof Error ? err.message : String(err));
    }
  };

  const setFilter = <K extends keyof FontsListQuery>(k: K, v: FontsListQuery[K]) =>
    setQuery((q) => ({ ...q, [k]: v, page: 1 }));

  const families = familiesQ.data?.data ?? [];
  const total = familiesQ.data?.pagination.total ?? 0;
  const totalPages = familiesQ.data?.pagination.totalPages ?? 1;

  const sectionTitle = libraryId
    ? (libraryQ.data?.name ?? 'Library')
    : sectionTitleFor(query);
  const activeFilterCount = countActiveFilters(query);

  const selectAllVisible = () => {
    setSelected((s) => {
      const next = new Set(s);
      for (const f of families) for (const v of f.variants) next.add(v.id);
      return next;
    });
  };

  return (
    <div className="flex gap-6 p-6">
      <FontLibrarySidebar
        filters={query}
        onChangeFilters={setQuery}
        onCreateLibrary={() => navigate('/libraries?new=1')}
      />

      <section className="flex-1 min-w-0 relative">
        <ActivationLegend />

        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="min-w-0">
            {libraryId && (
              <button
                onClick={() => {
                  searchParams.delete('library');
                  setSearchParams(searchParams, { replace: true });
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              >
                ← All fonts
              </button>
            )}
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-light tracking-tight truncate" title={sectionTitle}>
                {sectionTitle}
              </h1>
              {libraryId && (
                <Link
                  to={`/libraries/${libraryId}`}
                  className="text-xs text-zinc-500 hover:text-accent underline-offset-2 hover:underline"
                >
                  Manage library
                </Link>
              )}
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
              {familiesQ.isLoading
                ? 'Loading…'
                : `${total.toLocaleString()} famil${total === 1 ? 'y' : 'ies'}`}
              {selected.size > 0 ? (
                <>
                  <span className="mx-2 text-zinc-400">·</span>
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {selected.size} variant{selected.size === 1 ? '' : 's'} selected
                  </span>
                  <button
                    onClick={() => setSelected(new Set())}
                    className="ml-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Clear
                  </button>
                </>
              ) : (
                families.length > 0 && (
                  <>
                    <span className="mx-2 text-zinc-400">·</span>
                    <button
                      onClick={selectAllVisible}
                      className="text-xs text-zinc-500 hover:text-accent"
                    >
                      Select page
                    </button>
                  </>
                )
              )}
            </p>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => activateFamily(Array.from(selected), 'permanent')}
                className="text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-3 py-1.5 rounded-full"
                title="Activate every selected style permanently"
              >
                Activate ({selected.size})
              </button>
              <button
                onClick={() => {
                  deactivateFamily(Array.from(selected));
                }}
                className="text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-full"
              >
                Deactivate
              </button>
              {isElectron() && (
                <button
                  onClick={async () => {
                    const ids = Array.from(selected);
                    try {
                      const r = await collectFontsToDesktop(ids);
                      setSelected(new Set());
                      toast.success(
                        `Copied ${r.copied} font${r.copied === 1 ? '' : 's'} to Desktop`,
                        r.failed.length
                          ? `${r.failed.length} skipped (no binary on server).`
                          : r.folder,
                      );
                    } catch (err) {
                      toast.error(
                        'Collect to Desktop failed',
                        err instanceof Error ? err.message : String(err),
                      );
                    }
                  }}
                  className="text-sm bg-accent text-accent-fg hover:bg-accent-strong px-3 py-1.5 rounded-full"
                  title="Copy these fonts into ~/Desktop/Collected/"
                >
                  Collect to Desktop ⤓
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowPicker((s) => !s)}
                  className="text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-full"
                >
                  Add to library ▾
                </button>
                {showPicker && (
                  <div className="absolute right-0 top-full mt-2 z-20">
                    <CollectionPicker
                      fontIds={Array.from(selected)}
                      onDone={() => {
                        setShowPicker(false);
                        setSelected(new Set());
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 backdrop-blur">
          {/* Sort */}
          <div ref={sortRef} className="relative shrink-0">
            <button
              onClick={() => {
                setShowSort((s) => !s);
                setShowFilters(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              aria-haspopup="menu"
              aria-expanded={showSort}
            >
              <span className="text-xs uppercase tracking-wider text-zinc-500">Sort</span>
              <span className="font-medium">{sortLabel(query.sort)}</span>
              <Chevron />
            </button>
            {showSort && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 z-30 min-w-[160px] rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg py-1 text-sm"
              >
                {(['name', 'recent', 'activated'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setFilter('sort', s);
                      setShowSort(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      (query.sort ?? 'name') === s ? 'text-accent' : ''
                    }`}
                  >
                    {sortLabel(s)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div ref={filtersRef} className="relative shrink-0">
            <button
              onClick={() => {
                setShowFilters((s) => !s);
                setShowSort(false);
              }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
              aria-haspopup="menu"
              aria-expanded={showFilters}
            >
              <FilterIcon />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-accent text-accent-fg rounded-full px-1.5 py-0.5 leading-none ml-1">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {showFilters && (
              <div className="absolute left-0 top-full mt-1 z-30 w-64 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg p-3 text-sm space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Category</div>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { label: 'All', value: undefined },
                        { label: 'Sans', value: 'sans-serif' },
                        { label: 'Serif', value: 'serif' },
                        { label: 'Mono', value: 'monospace' },
                        { label: 'Display', value: 'display' },
                        { label: 'Hand', value: 'handwriting' },
                      ] as { label: string; value: FontCategory | undefined }[]
                    ).map((o) => {
                      const active = (query.category ?? undefined) === o.value;
                      return (
                        <button
                          key={o.label}
                          onClick={() => setFilter('category', o.value)}
                          className={`text-xs px-2 py-1 rounded ${
                            active
                              ? 'bg-accent text-accent-fg'
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!!query.variable}
                      onChange={(e) => setFilter('variable', e.target.checked || undefined)}
                      className="accent-accent"
                    />
                    Variable fonts only
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={!!query.active}
                      onChange={(e) => setFilter('active', e.target.checked || undefined)}
                      className="accent-accent"
                    />
                    Currently active
                  </label>
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() =>
                      setQuery((q) => ({
                        page: 1,
                        pageSize: q.pageSize,
                        sort: q.sort,
                        search: q.search,
                        source: q.source,
                      }))
                    }
                    className="text-xs text-accent hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {/* Font search — ⌘/ focuses, Esc clears */}
          <div className="flex items-center gap-1.5 shrink-0">
            <SearchIcon />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search fonts (⌘/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && search) {
                  e.preventDefault();
                  setSearch('');
                }
              }}
              className="bg-transparent text-sm focus:outline-none placeholder:text-zinc-500 text-zinc-800 dark:text-zinc-200 w-48"
              aria-label="Search fonts"
            />
          </div>

          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />

          {/* Preview text */}
          <input
            type="text"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            placeholder="Enter your own text…"
            className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none placeholder:text-zinc-500 text-zinc-800 dark:text-zinc-200"
            aria-label="Preview text"
          />
          {textDraft !== DEFAULT_PREVIEW_TEXT && (
            <button
              onClick={() => setTextDraft(DEFAULT_PREVIEW_TEXT)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 shrink-0"
              title="Reset preview text"
            >
              Reset
            </button>
          )}

          <div className="flex items-center gap-2 shrink-0 pl-3 ml-1 border-l border-zinc-200 dark:border-zinc-800">
            <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">
              {previewSize}px
            </span>
            <input
              type="range"
              min={12}
              max={120}
              step={1}
              value={previewSize}
              onChange={(e) => setPreviewSize(Number(e.target.value))}
              className="w-32 accent-accent"
              aria-label="Preview size"
            />
          </div>
        </div>

        {familiesQ.isLoading && families.length === 0 ? (
          <FontCardSkeletonGrid count={12} />
        ) : families.length === 0 ? (
          <EmptyResults
            search={query.search}
            hasFilters={activeFilterCount > 0}
            onClear={() => setQuery({ page: 1, pageSize: PAGE_SIZE, sort: 'name' })}
          />
        ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {families.map((family) => {
            const ids = family.variants.map((v) => v.id);
            const activeCount = ids.reduce((n, id) => (activeIds.has(id) ? n + 1 : n), 0);
            const modes = ids.map((id) => activeModes.get(id)).filter(Boolean) as ActivationMode[];
            const distinctModes = new Set(modes);
            const activeMode: ActivationMode | 'mixed' | null =
              modes.length === 0
                ? null
                : distinctModes.size > 1
                  ? 'mixed'
                  : (modes[0] ?? null);
            const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
            return (
              <FamilyCard
                key={`${family.source}:${family.familyName}`}
                family={family}
                selected={allSelected}
                onToggleSelect={() => toggleSelectFamily(ids)}
                activeCount={activeCount}
                activeMode={activeMode}
                onActivateAll={(mode) => activateFamily(ids, mode)}
                onDeactivateAll={() => deactivateFamily(ids)}
                previewText={storedText}
                previewSize={previewSize}
              />
            );
          })}
        </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 text-sm">
            <button
              disabled={(query.page ?? 1) <= 1}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
              className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-zinc-600 dark:text-zinc-400">
              Page {query.page ?? 1} of {totalPages}
            </span>
            <button
              disabled={(query.page ?? 1) >= totalPages}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
              className="px-3 py-1.5 rounded-md bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ActivationLegend() {
  return (
    <div className="flex items-center gap-4 mb-3 text-xs text-zinc-500">
      <LegendDot color="bg-cyan-500" label="Temporary" hint="Stays active until you quit the desktop client." />
      <LegendDot color="bg-green-500" label="Permanent" hint="Persists across restarts and other machines." />
      <LegendDot color="bg-zinc-400 dark:bg-zinc-600" label="Deactivate" hint="Remove from CoreText so apps no longer see it." />
    </div>
  );
}

function LegendDot({ color, label, hint }: { color: string; label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={hint}>
      <span aria-hidden="true" className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </span>
  );
}

function sectionTitleFor(q: FontsListQuery): string {
  if (q.source === 'adobe') return 'Adobe Fonts';
  if (q.source === 'google') return 'Google Fonts';
  if (q.source === 'local') return 'Local';
  if (q.source === 'system') return 'Mac OS';
  if (q.source === 'user-installed') return 'Font Book';
  if (q.favorited) return 'Starred';
  if (q.tag) return `Tag · ${q.tag}`;
  if (q.active) return 'Activated Fonts';
  if (q.variable) return 'Variable Fonts';
  if (q.sort === 'recent') return 'Recently Added';
  if (q.search) return `Search · ${q.search}`;
  return 'All Fonts';
}

function countActiveFilters(q: FontsListQuery): number {
  let n = 0;
  if (q.category) n++;
  if (q.variable) n++;
  if (q.active) n++;
  return n;
}

function sortLabel(s: FontsListQuery['sort']): string {
  switch (s ?? 'name') {
    case 'name': return 'Name';
    case 'recent': return 'Recently added';
    case 'activated': return 'Most activated';
  }
}

function Chevron() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M2 3h10M3.5 7h7M5 11h4" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" className="text-zinc-500">
      <circle cx="6" cy="6" r="4" />
      <path d="M9 9l3 3" strokeLinecap="round" />
    </svg>
  );
}

function EmptyResults({
  search,
  hasFilters,
  onClear,
}: {
  search?: string;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl py-16 px-6 text-center">
      <div className="text-5xl text-zinc-300 dark:text-zinc-700 mb-4" aria-hidden="true">
        Aa
      </div>
      <h3 className="text-lg font-light tracking-tight">
        {search ? `No fonts match “${search}”` : 'No fonts in this view'}
      </h3>
      <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
        {search
          ? 'Try a shorter query, or relax the active filters.'
          : hasFilters
            ? 'Your filters narrowed the list to nothing. Clear them to see everything.'
            : 'Once your team adds fonts, they’ll appear here.'}
      </p>
      {(search || hasFilters) && (
        <button
          onClick={onClear}
          className="mt-4 text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-1.5 rounded-md"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
