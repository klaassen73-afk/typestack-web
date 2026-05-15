import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFont } from '../api/fonts';
import { getActivationState, activateFonts, deactivateFonts } from '../api/activation';
import { fontPreviewUrl, waterfallUrl } from '../api/client';
import { formatBytes } from '../lib/format';
import { useIsDark } from '../stores/themeStore';
import CollectionPicker from '../components/CollectionPicker';
import FontPairings from '../components/FontPairings';
import { isActivatable, sourceChipClass, sourceLabel, sourceLicense } from '../lib/sourceMeta';
import { toast } from '../components/Toast';
import { SkeletonLine } from '../components/Skeleton';
import StarButton from '../components/StarButton';
import TagEditor from '../components/TagEditor';

export default function FontPreview() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const [text, setText] = useState('The quick brown fox jumps over the lazy dog');
  const [size, setSize] = useState(72);
  const [showWaterfall, setShowWaterfall] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const fontQ = useQuery({ queryKey: ['font', id], queryFn: () => getFont(id) });
  const activationQ = useQuery({ queryKey: ['activation', 'state'], queryFn: getActivationState });
  const isDark = useIsDark();
  const previewBg = isDark ? '09090b' : 'ffffff';
  const previewFg = isDark ? 'fafafa' : '000000';

  if (fontQ.isLoading) {
    return (
      <div className="p-6 max-w-5xl">
        <SkeletonLine className="h-3 w-24 mb-2" />
        <SkeletonLine className="h-8 w-2/3 mb-3" />
        <div className="flex gap-2 mb-6">
          <SkeletonLine className="h-4 w-12" />
          <SkeletonLine className="h-4 w-16" />
          <SkeletonLine className="h-4 w-24" />
        </div>
        <SkeletonLine className="h-40 w-full mb-4 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonLine className="h-48 w-full rounded-xl" />
          <SkeletonLine className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (fontQ.error || !fontQ.data) {
    return (
      <div className="p-6 max-w-md">
        <Link to="/fonts" className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
          ← All fonts
        </Link>
        <h1 className="text-2xl font-light tracking-tight mt-2">Font not found</h1>
        <p className="text-sm text-zinc-500 mt-1">
          This font may have been removed, or you don’t have access to it. Try the search or pick a
          library from the sidebar.
        </p>
      </div>
    );
  }

  const font = fontQ.data;
  const isActive = activationQ.data?.activeFonts.some((f) => f.fontId === font.id);

  const previewSrc = showWaterfall
    ? waterfallUrl(font.id, { text, width: 1200, bg: previewBg, fg: previewFg })
    : fontPreviewUrl(font.id, { text, size, width: 1200, bg: previewBg, fg: previewFg });

  const toggleActive = async () => {
    try {
      if (isActive) {
        await deactivateFonts([font.id]);
        toast.success(`${font.familyName} deactivated`);
      } else {
        await activateFonts([font.id]);
        toast.success(`${font.familyName} activated`, 'Available across all your apps.');
      }
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
    } catch (err) {
      toast.error('Activation failed', err instanceof Error ? err.message : String(err));
    }
  };

  const metadata = (font.metadata ?? {}) as Record<string, unknown>;
  const variableAxes = font.variableAxes ? Object.entries(font.variableAxes) : [];

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link to="/fonts" className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
            ← All fonts
          </Link>
          <h1 className="text-3xl font-light tracking-tight mt-1">
            {font.familyName}
            <span className="text-zinc-500 font-normal ml-3">{font.subfamily}</span>
          </h1>
          <div className="text-xs text-zinc-500 mt-2 flex flex-wrap gap-2 items-center">
            <span
              title={sourceLicense(font.source)}
              className={`uppercase tracking-wider px-1.5 py-0.5 rounded cursor-help ${sourceChipClass(font.source)}`}
            >
              {sourceLabel(font.source)}
            </span>
            {font.category && (
              <span className="uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                {font.category}
              </span>
            )}
            {font.postscriptName && <span className="font-mono">{font.postscriptName}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <StarButton fontId={font.id} size={22} className="mr-1" />
          {isActivatable(font.source) ? (
            <button
              onClick={toggleActive}
              title={
                isActive
                  ? 'Currently active — click to deactivate'
                  : 'Make this font available across all your apps'
              }
              className={`text-sm px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${
                isActive
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
                  : 'bg-zinc-900 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white'
              }`}
            >
              {isActive && (
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green-700 dark:bg-green-300" />
              )}
              {isActive ? 'Active' : 'Activate'}
            </button>
          ) : (
            <span
              title={sourceLicense(font.source)}
              className="text-sm px-3 py-1.5 rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800/70 dark:text-zinc-400 inline-flex items-center gap-1.5 cursor-help"
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
              Always available
            </span>
          )}
          <button
            onClick={() => setShowPicker((s) => !s)}
            className="text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-md"
          >
            Save to library ▾
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-2 z-20">
              <CollectionPicker
                fontIds={[font.id]}
                onDone={() => setShowPicker(false)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 p-4 mb-4">
        <div className="flex items-center gap-4 mb-3 text-sm">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600"
          />
          {!showWaterfall && (
            <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span>Size</span>
              <input
                type="range"
                min={12}
                max={160}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span className="font-mono text-xs w-8">{size}</span>
            </label>
          )}
          <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={showWaterfall}
              onChange={(e) => setShowWaterfall(e.target.checked)}
              className="accent-zinc-700 dark:accent-zinc-200"
            />
            <span>Waterfall</span>
          </label>
        </div>
        <div className="bg-white dark:bg-zinc-950 rounded overflow-hidden">
          {font.source === 'system' || font.source === 'user-installed' ? (
            <ClientSidePreview
              font={font}
              text={text}
              size={size}
              showWaterfall={showWaterfall}
              isDark={isDark}
            />
          ) : font.filePath ? (
            <img src={previewSrc} alt={font.familyName} className="block w-full" />
          ) : (
            <div className="p-8 text-zinc-500 text-center">No binary on server — preview unavailable.</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 p-4">
          <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Metadata</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Family" value={font.familyName} />
            <Row label="Subfamily" value={font.subfamily ?? '—'} />
            <Row label="PostScript" value={font.postscriptName ?? '—'} />
            <Row label="Source" value={font.source} />
            <Row label="Category" value={font.category ?? '—'} />
            <Row label="Tags" value={font.tags.length > 0 ? font.tags.join(', ') : '—'} />
            <Row label="Variable" value={font.variableAxes ? 'yes' : 'no'} />
            <Row label="Designer" value={(metadata.designer as string) ?? '—'} />
            <Row label="License" value={(metadata.license as string) ?? '—'} />
            <Row label="Version" value={(metadata.version as string) ?? '—'} />
            {typeof metadata.size === 'number' && (
              <Row label="Size" value={formatBytes(metadata.size)} />
            )}
          </dl>
        </div>

        {variableAxes.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 p-4">
            <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Variable axes</h2>
            <ul className="space-y-2 text-sm">
              {variableAxes.map(([tag, axis]) => (
                <li key={tag} className="flex items-center justify-between">
                  <span className="font-mono">{tag}</span>
                  <span className="text-zinc-500 text-xs">
                    {axis.min} – {axis.max} (default {axis.default})
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-zinc-500 mt-3">
              This font supports continuous axis tuning. Live axis sliders are coming soon — for now
              the preview uses the default instance.
            </p>
          </div>
        )}
      </div>

      <section className="mt-8">
        <TagEditor fontId={font.id} initialTags={font.tags} />
      </section>

      <section className="mt-8">
        <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-3">Pairs well with</h2>
        <FontPairings font={font} />
      </section>
    </div>
  );
}

const WATERFALL_SIZES = [8, 10, 12, 14, 18, 24, 36, 48, 72];

function ClientSidePreview({
  font,
  text,
  size,
  showWaterfall,
  isDark,
}: {
  font: { familyName: string };
  text: string;
  size: number;
  showWaterfall: boolean;
  isDark: boolean;
}) {
  const color = isDark ? '#fafafa' : '#000000';
  const fontFamily = `"${font.familyName}", system-ui, sans-serif`;
  if (showWaterfall) {
    return (
      <div className="p-6 space-y-2">
        {WATERFALL_SIZES.map((s) => (
          <div
            key={s}
            style={{ fontFamily, fontSize: s, lineHeight: 1.3, color }}
            className="truncate"
            title={font.familyName}
          >
            {text}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="p-6">
      <div
        style={{ fontFamily, fontSize: size, lineHeight: 1.2, color }}
        className="break-words"
        title={font.familyName}
      >
        {text}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-800 dark:text-zinc-200 text-right truncate">{value}</dd>
    </div>
  );
}
