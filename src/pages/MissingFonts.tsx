import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { resolveMissingFonts, type MissingFontMatch, type MissingFontResult } from '../api/missingFonts';
import { sourceChipClass, sourceLabel } from '../lib/sourceMeta';
import StarButton from '../components/StarButton';
import { toast } from '../components/Toast';

const SAMPLE = `Helvetica Neue
Avenir Next
Some Foundry Wonder Display
Brandon Grotesque`;

export default function MissingFonts() {
  const [draft, setDraft] = useState('');
  const resolve = useMutation({
    mutationFn: (names: string[]) => resolveMissingFonts(names),
    onError: (err) => toast.error('Resolve failed', err instanceof Error ? err.message : String(err)),
  });

  const submit = (): void => {
    const names = draft
      .split(/\r?\n|,/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    resolve.mutate(names);
  };

  const results = resolve.data?.data ?? [];
  const found = results.filter((r) => r.best && r.best.score >= 0.999).length;
  const fuzzy = results.filter(
    (r) => r.best && r.best.score < 0.999 && r.matches.length > 0,
  ).length;
  const missing = results.filter((r) => r.matches.length === 0).length;

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-5">
        <h1 className="text-2xl font-light tracking-tight">Find missing fonts</h1>
        <p className="text-sm text-zinc-500 mt-1 max-w-xl">
          Paste the family names from a missing-fonts dialog (Adobe’s “Missing
          Fonts” panel, Figma, Sketch, etc.). We’ll match each one against your
          libraries and show the closest replacements with a confidence score.
        </p>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        placeholder={SAMPLE}
        className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600"
        aria-label="Missing font names"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={submit}
          disabled={resolve.isPending || !draft.trim()}
          className="text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white px-4 py-1.5 rounded-md disabled:opacity-50"
        >
          {resolve.isPending ? 'Searching…' : 'Find matches'}
        </button>
        <button
          onClick={() => {
            setDraft(SAMPLE);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Use sample
        </button>
        {draft && (
          <button
            onClick={() => {
              setDraft('');
              resolve.reset();
            }}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Clear
          </button>
        )}
      </div>

      {resolve.isSuccess && results.length > 0 && (
        <div className="mt-6">
          <div className="text-xs text-zinc-500 mb-3 flex flex-wrap gap-2">
            <Pill tone="green">{found} exact</Pill>
            <Pill tone="amber">{fuzzy} close match{fuzzy === 1 ? '' : 'es'}</Pill>
            <Pill tone="red">{missing} not found</Pill>
          </div>
          <ul className="space-y-3">
            {results.map((r) => (
              <ResultRow key={r.query} result={r} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'green' | 'amber' | 'red';
}) {
  const toneCls =
    tone === 'green'
      ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
        : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return (
    <span className={`uppercase tracking-wider px-1.5 py-0.5 rounded text-[10px] ${toneCls}`}>
      {children}
    </span>
  );
}

function ResultRow({ result }: { result: MissingFontResult }) {
  if (result.matches.length === 0) {
    return (
      <li className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate" title={result.query}>
              {result.query}
            </div>
            <div className="text-xs text-zinc-500">No match in your libraries</div>
          </div>
          <Pill tone="red">Not found</Pill>
        </div>
      </li>
    );
  }
  const exact = result.matches[0].score >= 0.999;
  return (
    <li className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/30 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate" title={result.query}>
            {result.query}
          </div>
          <div className="text-xs text-zinc-500">
            {result.matches.length} {result.matches.length === 1 ? 'candidate' : 'candidates'}
          </div>
        </div>
        {exact ? <Pill tone="green">Exact</Pill> : <Pill tone="amber">Close match</Pill>}
      </div>
      <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800/60">
        {result.matches.map((m) => (
          <MatchRow key={m.font.id} match={m} />
        ))}
      </ul>
    </li>
  );
}

function MatchRow({ match }: { match: MissingFontMatch }) {
  const pct = Math.round(match.score * 100);
  return (
    <li className="px-4 py-2 flex items-center justify-between gap-3 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/40">
      <div className="min-w-0 flex items-center gap-2">
        <StarButton fontId={match.font.id} size={14} />
        <Link
          to={`/fonts/${match.font.id}`}
          className="text-sm truncate hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {match.font.familyName}
        </Link>
        {match.font.subfamily && (
          <span className="text-xs text-zinc-500 truncate">{match.font.subfamily}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${sourceChipClass(match.font.source)}`}
        >
          {sourceLabel(match.font.source)}
        </span>
        <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{pct}%</span>
      </div>
    </li>
  );
}
