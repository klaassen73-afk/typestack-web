import { Link } from 'react-router-dom';
import type { Font } from '../api/types';
import { fontPreviewUrl } from '../api/client';
import { useIsDark } from '../stores/themeStore';
import { sourceChipClass, sourceLabel, sourceLicense } from '../lib/sourceMeta';

interface Props {
  font: Font;
  selected?: boolean;
  onToggleSelect?: () => void;
  active?: boolean;
  onToggleActive?: () => void;
}


export default function FontCard({ font, selected, onToggleSelect, active, onToggleActive }: Props) {
  const isDark = useIsDark();
  const previewBg = isDark ? '09090b' : 'ffffff';
  const previewFg = isDark ? 'fafafa' : '000000';

  return (
    <div
      className={`group relative rounded-lg border ${
        selected
          ? 'border-zinc-500 dark:border-zinc-300'
          : 'border-zinc-200 dark:border-zinc-800'
      } bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 transition-colors overflow-hidden flex flex-col`}
      style={{ minHeight: 180 }}
    >
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="accent-zinc-700 dark:accent-zinc-200"
          />
        )}
      </div>
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        <span
          title={sourceLicense(font.source)}
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded cursor-help ${sourceChipClass(font.source)}`}
        >
          {sourceLabel(font.source)}
        </span>
      </div>

      <Link to={`/fonts/${font.id}`} className="flex-1 flex items-center justify-center px-4 py-8">
        {font.source === 'system' || font.source === 'user-installed' ? (
          <span
            className="block max-w-full truncate"
            style={{
              fontFamily: `"${font.familyName}", system-ui, sans-serif`,
              fontSize: 56,
              lineHeight: 1.2,
              color: isDark ? '#fafafa' : '#000000',
            }}
            title={font.familyName}
          >
            Aa Bb 123
          </span>
        ) : font.filePath ? (
          <img
            src={fontPreviewUrl(font.id, {
              text: 'Aa Bb 123',
              size: 56,
              width: 600,
              bg: previewBg,
              fg: previewFg,
            })}
            alt={font.familyName}
            className="max-w-full h-auto"
            loading="lazy"
          />
        ) : (
          <span className="text-zinc-400 dark:text-zinc-600 text-sm">no binary</span>
        )}
      </Link>

      <div className="border-t border-zinc-200/70 dark:border-zinc-800/50 px-3 py-2 flex items-center justify-between">
        <div className="min-w-0">
          <Link
            to={`/fonts/${font.id}`}
            className="block truncate text-sm hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {font.familyName}
          </Link>
          <div className="text-xs text-zinc-500 truncate">
            {font.subfamily ?? '—'}
            {font.category && <span className="ml-2">· {font.category}</span>}
          </div>
        </div>
        {font.source === 'system' ? (
          <span
            className="shrink-0 ml-2 text-[10px] uppercase tracking-wider text-zinc-500"
            title="Mac OS-protected font — always available, can't be activated or deactivated"
          >
            Always on
          </span>
        ) : (
          onToggleActive && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onToggleActive();
              }}
              className={`shrink-0 ml-2 text-xs px-2 py-1 rounded ${
                active
                  ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60'
                  : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {active ? 'Active' : 'Activate'}
            </button>
          )
        )}
      </div>
    </div>
  );
}
