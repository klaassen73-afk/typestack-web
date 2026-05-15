import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  deactivateFonts,
  getActivationState,
  listActivationHistory,
} from '../api/activation';
import type { ActivationEvent, ActiveFontEntry } from '../api/types';
import { formatRelative } from '../lib/format';
import { sourceChipClass, sourceLabel } from '../lib/sourceMeta';
import { toast } from '../components/Toast';

export default function Activation() {
  const qc = useQueryClient();
  const stateQ = useQuery({
    queryKey: ['activation', 'state'],
    queryFn: getActivationState,
    refetchInterval: 5_000,
  });
  const historyQ = useQuery({
    queryKey: ['activation', 'history'],
    queryFn: () => listActivationHistory(50),
    refetchInterval: 10_000,
  });

  const deactivateMut = useMutation({
    mutationFn: (ids: string[]) => deactivateFonts(ids),
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      qc.invalidateQueries({ queryKey: ['activation', 'history'] });
      toast.success(`Deactivated ${ids.length} ${ids.length === 1 ? 'style' : 'styles'}`);
    },
    onError: (err) => toast.error('Deactivation failed', err instanceof Error ? err.message : String(err)),
  });

  const active = stateQ.data?.activeFonts ?? [];
  const history = historyQ.data?.data ?? [];

  // Collapse styles into family rows so a Helvetica Neue 14-weight activation
  // doesn't dump 14 lines into the list.
  const families = useMemo(() => groupActiveByFamily(active), [active]);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-light">Active fonts</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {active.length === 0
                ? 'Nothing active right now.'
                : `${families.length} ${families.length === 1 ? 'family' : 'families'} · ${active.length} ${active.length === 1 ? 'style' : 'styles'}`}
            </p>
          </div>
          {active.length > 0 && (
            <button
              onClick={() => deactivateMut.mutate(active.map((f) => f.fontId))}
              disabled={deactivateMut.isPending}
              className="text-sm text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
            >
              Deactivate all
            </button>
          )}
        </div>
        {active.length === 0 ? (
          <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl py-10 px-6 text-center">
            <div className="text-3xl text-zinc-300 dark:text-zinc-700 mb-2" aria-hidden="true">◌</div>
            <p className="text-sm text-zinc-500">
              No fonts active. Activate one from the{' '}
              <Link to="/fonts" className="text-zinc-700 dark:text-zinc-300 underline">
                font browser
              </Link>{' '}
              or open a library and click Activate all.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {families.map((fam) => (
              <li
                key={`${fam.source}:${fam.familyName}`}
                className="px-3 py-2 rounded-md bg-zinc-50 border border-zinc-200 dark:bg-zinc-900/30 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <Link
                      to={`/fonts/${fam.primaryId}`}
                      className="text-sm hover:text-zinc-700 dark:hover:text-zinc-300 truncate"
                      title={fam.familyName}
                    >
                      {fam.familyName}
                    </Link>
                    <span
                      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${sourceChipClass(fam.source)}`}
                    >
                      {sourceLabel(fam.source)}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">
                      {fam.styles.length} {fam.styles.length === 1 ? 'style' : 'styles'}
                    </span>
                  </div>
                  <button
                    onClick={() => deactivateMut.mutate(fam.styles.map((s) => s.fontId))}
                    className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 shrink-0"
                  >
                    Deactivate
                  </button>
                </div>
                <div className="text-xs text-zinc-500 mt-1 flex flex-wrap gap-2 items-center">
                  <span>{formatRelative(fam.latestActivation)}</span>
                  {fam.modes.has('temporary') && (
                    <span className="uppercase tracking-wider px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                      Temporary
                    </span>
                  )}
                  {fam.triggers.has('auto') && (
                    <span className="uppercase tracking-wider px-1 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                      Auto
                    </span>
                  )}
                  {fam.triggers.has('collection') && (
                    <span className="uppercase tracking-wider px-1 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                      Library
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-xl font-light mb-3">Recent history</h2>
        <ActivityFeed events={history} />
      </section>
    </div>
  );
}

interface FamilyGroup {
  familyName: string;
  source: ActiveFontEntry['source'];
  primaryId: string;
  styles: ActiveFontEntry[];
  modes: Set<ActiveFontEntry['mode']>;
  triggers: Set<ActiveFontEntry['triggeredBy']>;
  latestActivation: string;
}

function groupActiveByFamily(active: ActiveFontEntry[]): FamilyGroup[] {
  const map = new Map<string, FamilyGroup>();
  for (const f of active) {
    const key = `${f.source}:${f.familyName}`;
    const existing = map.get(key);
    if (existing) {
      existing.styles.push(f);
      existing.modes.add(f.mode);
      existing.triggers.add(f.triggeredBy);
      if (f.activatedAt > existing.latestActivation) {
        existing.latestActivation = f.activatedAt;
        existing.primaryId = f.fontId;
      }
    } else {
      map.set(key, {
        familyName: f.familyName,
        source: f.source,
        primaryId: f.fontId,
        styles: [f],
        modes: new Set([f.mode]),
        triggers: new Set([f.triggeredBy]),
        latestActivation: f.activatedAt,
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.latestActivation.localeCompare(a.latestActivation),
  );
}

const triggerStyles: Record<
  ActivationEvent['triggeredBy'],
  { label: string; chip: string }
> = {
  manual:     { label: 'Manual',     chip: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  collection: { label: 'Library',    chip: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300' },
  auto:       { label: 'Auto',       chip: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' },
};

interface EventGroup {
  key: string;
  label: string;            // e.g. "InDesign · auto" or "Manual"
  trigger: ActivationEvent['triggeredBy'];
  appName: string | null;
  earliest: string;
  latest: string;
  events: ActivationEvent[];
}

/**
 * Groups consecutive events that share (trigger, appName) so a single auto-
 * activation that touched 80 fonts collapses to one row with a font count and
 * an expandable list. Manual single-font activations stay as their own row.
 */
function groupEvents(events: ActivationEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const e of events) {
    const key = `${e.triggeredBy}|${e.appName ?? ''}|${e.action}`;
    const last = groups[groups.length - 1];
    // Coalesce into the prior group if it has the same key AND the timestamp
    // is within a few seconds (one logical action). Beyond that, start a new
    // group so the user can see distinct activations.
    const within10s = last && Math.abs(
      new Date(e.createdAt).getTime() - new Date(last.latest).getTime(),
    ) < 10_000;
    if (last && last.key === key && within10s) {
      last.events.push(e);
      last.latest = e.createdAt;
      if (e.createdAt < last.earliest) last.earliest = e.createdAt;
      continue;
    }
    groups.push({
      key,
      label: e.appName ?? triggerStyles[e.triggeredBy].label,
      trigger: e.triggeredBy,
      appName: e.appName,
      earliest: e.createdAt,
      latest: e.createdAt,
      events: [e],
    });
  }
  return groups;
}

function ActivityFeed({ events }: { events: ActivationEvent[] }) {
  const groups = useMemo(() => groupEvents(events), [events]);
  if (groups.length === 0) {
    return (
      <p className="text-zinc-500 py-6 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg text-sm">
        No events yet.
      </p>
    );
  }
  return (
    <ul className="space-y-1 text-sm">
      {groups.map((g) => (
        <ActivityGroupRow key={`${g.key}-${g.latest}`} group={g} />
      ))}
    </ul>
  );
}

function ActivityGroupRow({ group }: { group: EventGroup }) {
  const e0 = group.events[0];
  const isActivate = e0.action === 'activate';
  const style = triggerStyles[group.trigger];
  const count = group.events.length;
  const summary = count === 1
    ? (e0.familyName ?? e0.fontId.slice(0, 8))
    : `${count} fonts`;

  return (
    <li className="px-3 py-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
      <div className="flex items-center gap-2">
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
            isActivate
              ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {isActivate ? 'Activated' : 'Deactivated'}
        </span>
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${style.chip}`}>
          {group.appName ?? style.label}
        </span>
        <span className="text-sm truncate min-w-0 flex-1">{summary}</span>
        <span className="text-xs text-zinc-500 shrink-0">{formatRelative(group.latest)}</span>
      </div>
      {count > 1 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
            Show families
          </summary>
          <ul className="mt-1 ml-2 space-y-0.5 max-h-48 overflow-y-auto">
            {group.events.map((e) => (
              <li key={e.id} className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                <Link
                  to={`/fonts/${e.fontId}`}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                  title={e.familyName ?? e.fontId}
                >
                  {e.familyName ?? e.fontId.slice(0, 8)}
                </Link>
                {e.subfamily && <span className="text-zinc-500 ml-1">· {e.subfamily}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
