import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCollection, listCollections } from '../api/collections';
import { listTags } from '../api/tags';
import { useAuthStore } from '../stores/authStore';
import type { Collection, FontsListQuery, FontSource } from '../api/types';

interface Props {
  filters: FontsListQuery;
  onChangeFilters: (next: FontsListQuery) => void;
  onCreateLibrary?: () => void;
}

export default function FontLibrarySidebar({ filters, onChangeFilters, onCreateLibrary }: Props) {
  const me = useAuthStore((s) => s.user);
  const isAdmin = me?.role === 'admin';

  const collectionsQ = useQuery({ queryKey: ['collections'], queryFn: listCollections });
  const collections = collectionsQ.data?.data ?? [];
  const tagsQ = useQuery({ queryKey: ['tags'], queryFn: listTags, staleTime: 60_000 });
  const tags = tagsQ.data?.data ?? [];

  // Collections fall into Team Libraries if they're shared (have members) or
  // owned by someone else. Personal Libraries are unshared collections owned
  // by the current user.
  const personal = collections.filter(
    (c) => me && c.ownerUserId === me.id && c.memberCount === 0,
  );
  const team = collections.filter(
    (c) => !me || c.ownerUserId !== me.id || c.memberCount > 0,
  );

  const pageSize = filters.pageSize ?? 60;
  const baseFilters: FontsListQuery = { page: 1, pageSize, sort: 'name' };

  const clearFilters = () => onChangeFilters(baseFilters);
  const setSource = (s: FontSource | undefined) =>
    onChangeFilters({ ...baseFilters, source: s });
  const setSmart = (next: Partial<FontsListQuery>) =>
    onChangeFilters({ ...baseFilters, ...next });

  const isAllFonts =
    !filters.source &&
    !filters.category &&
    !filters.active &&
    !filters.variable &&
    (filters.sort ?? 'name') === 'name' &&
    !filters.search;

  return (
    <aside className="w-64 shrink-0 text-sm space-y-4">
      {/* All Fonts and the source/smart-search shortcuts are admin-only —
          regular users can't browse outside their granted libraries. */}
      {isAdmin && (
        <ul className="space-y-0.5">
          <li>
            <NavItem
              label="All Fonts"
              active={isAllFonts}
              onClick={clearFilters}
              icon={<AaIcon />}
              bold
            />
          </li>
        </ul>
      )}

      <Section title="Personal Libraries" defaultOpen action={onCreateLibrary}>
        {personal.length === 0 ? (
          <Empty>No personal libraries yet</Empty>
        ) : (
          personal.map((c) => <LibraryItem key={c.id} collection={c} />)
        )}
      </Section>

      <Section title="Team Libraries" defaultOpen>
        {team.length === 0 ? (
          <Empty>No shared libraries</Empty>
        ) : (
          team.map((c) => <LibraryItem key={c.id} collection={c} />)
        )}
      </Section>

      {/* Subscription, system, and smart-search shortcuts are available to
          every authenticated user — those font sources aren't gated by
          library membership (Adobe CC subscription, open-source Google Fonts,
          OS-installed fonts). The team-curated 'local' fonts are still gated
          via library access. "All Fonts" remains admin-only. */}
      <Section title="Subscription Fonts">
        <NavItem
          label="Adobe Fonts"
          active={filters.source === 'adobe'}
          onClick={() => setSource('adobe')}
        />
        <NavItem
          label="Google Fonts"
          active={filters.source === 'google'}
          onClick={() => setSource('google')}
        />
      </Section>

      <Section title="System Fonts">
        <NavItem
          label="Mac OS"
          active={filters.source === 'system'}
          onClick={() => setSource('system')}
        />
        <NavItem
          label="Font Book"
          active={filters.source === 'user-installed'}
          onClick={() => setSource('user-installed')}
        />
      </Section>

      {tags.length > 0 && (
        <Section title="Tags">
          {tags.slice(0, 12).map((t) => (
            <NavItem
              key={t.tag}
              label={t.tag}
              count={t.count}
              active={filters.tag === t.tag}
              onClick={() => onChangeFilters({ ...filters, tag: t.tag, page: 1 })}
            />
          ))}
        </Section>
      )}

      <Section title="Smart Searches">
        <NavItem
          label="Starred"
          active={!!filters.favorited}
          onClick={() => setSmart({ favorited: true })}
        />
        <NavItem
          label="Activated Fonts"
          active={!!filters.active}
          onClick={() => setSmart({ active: true })}
        />
        <NavItem
          label="Variable Fonts"
          active={!!filters.variable}
          onClick={() => setSmart({ variable: true })}
        />
        <NavItem
          label="Recently Added"
          active={filters.sort === 'recent'}
          onClick={() => setSmart({ sort: 'recent' })}
        />
      </Section>
    </aside>
  );
}

function Section({
  title,
  children,
  defaultOpen = false,
  action,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  action?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 py-1"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`transition-transform shrink-0 ${open ? '' : '-rotate-90'}`}
            aria-hidden="true"
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{title}</span>
        </button>
        {action && (
          <button
            onClick={action}
            className="text-zinc-500 hover:text-accent leading-none px-1"
            title={`Add to ${title}`}
            aria-label={`Add to ${title}`}
          >
            +
          </button>
        )}
      </div>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

function NavItem({
  label,
  active,
  onClick,
  icon,
  count,
  bold,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  count?: number;
  bold?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded ${
        active
          ? 'bg-accent/10 text-accent font-medium'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
      }`}
    >
      {icon && <span className="shrink-0 text-zinc-500">{icon}</span>}
      <span className={`flex-1 truncate ${bold ? 'font-medium' : ''}`}>{label}</span>
      {count !== undefined && (
        <span className="text-xs text-zinc-500 tabular-nums shrink-0">{count.toLocaleString()}</span>
      )}
    </button>
  );
}

const SIDEBAR_FAMILY_PREVIEW_LIMIT = 200;

function LibraryItem({ collection }: { collection: Collection }) {
  const loc = useLocation();
  // Active when the user is browsing this library in the font grid OR sitting
  // on its management page.
  const params = new URLSearchParams(loc.search);
  const active =
    (loc.pathname === '/fonts' && params.get('library') === collection.id) ||
    loc.pathname === `/libraries/${collection.id}`;
  const [expanded, setExpanded] = useState(false);

  // Only fetch the collection's fonts when the user expands the row, so the
  // sidebar stays cheap for users with many libraries.
  const detailQ = useQuery({
    queryKey: ['collection', collection.id],
    queryFn: () => getCollection(collection.id),
    enabled: expanded && collection.fontCount > 0,
  });

  // 5k+ styles collapse to a few hundred families. Dedup on familyName,
  // remembering one representative font id per family for the deep link.
  const families = useMemo(() => {
    if (!detailQ.data) return [] as Array<{ id: string; name: string }>;
    const seen = new Set<string>();
    const out: Array<{ id: string; name: string }> = [];
    for (const f of detailQ.data.fonts) {
      if (seen.has(f.familyName)) continue;
      seen.add(f.familyName);
      out.push({ id: f.id, name: f.familyName });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [detailQ.data]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-1 rounded ${
          active
            ? 'bg-accent/10 text-accent font-medium'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="shrink-0 px-1 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          aria-label={expanded ? `Collapse ${collection.name}` : `Expand ${collection.name}`}
          aria-expanded={expanded}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className={`transition-transform ${expanded ? '' : '-rotate-90'}`}
            aria-hidden="true"
          >
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <Link
          to={`/fonts?library=${collection.id}`}
          className="flex-1 min-w-0 py-1.5 flex items-center gap-2"
        >
          <span className="flex-1 truncate text-sm">{collection.name}</span>
          <span className="text-xs text-zinc-500 tabular-nums shrink-0">
            {collection.fontCount.toLocaleString()}
          </span>
        </Link>
      </div>

      {expanded && (
        <ul className="ml-5 mt-0.5 mb-1 max-h-72 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 pl-2 space-y-0.5">
          {detailQ.isLoading && (
            <li className="text-xs text-zinc-500 py-1">Loading families…</li>
          )}
          {detailQ.isError && (
            <li className="text-xs text-red-500 py-1">Couldn’t load fonts</li>
          )}
          {detailQ.isSuccess && families.length === 0 && (
            <li className="text-xs text-zinc-500 py-1 italic">Empty library</li>
          )}
          {families.slice(0, SIDEBAR_FAMILY_PREVIEW_LIMIT).map((f) => (
            <li key={f.id}>
              <Link
                to={`/fonts/${f.id}`}
                className="block truncate text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 px-1 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                title={f.name}
              >
                {f.name}
              </Link>
            </li>
          ))}
          {families.length > SIDEBAR_FAMILY_PREVIEW_LIMIT && (
            <li>
              <Link
                to={`/fonts?library=${collection.id}`}
                className="block text-xs text-accent hover:underline px-1 py-1"
              >
                +{families.length - SIDEBAR_FAMILY_PREVIEW_LIMIT} more — open library
              </Link>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-500 px-2 py-1">{children}</p>;
}

function AaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <text x="0" y="11" fontSize="12" fontWeight="600" fontFamily="serif" fill="currentColor">
        Aa
      </text>
    </svg>
  );
}
