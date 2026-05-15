import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivationMode, FamilyGroup, FamilyVariant } from '../api/types';
import { fontPreviewUrl } from '../api/client';
import { useIsDark } from '../stores/themeStore';
import { sourceChipClass, sourceLabel, sourceLicense } from '../lib/sourceMeta';
import StarButton from './StarButton';
import HoverPreview from './HoverPreview';

interface Props {
  family: FamilyGroup;
  selected?: boolean;
  onToggleSelect?: () => void;
  activeCount: number;
  activeMode: ActivationMode | 'mixed' | null;
  onActivateAll?: (mode: ActivationMode) => void;
  onDeactivateAll?: () => void;
  previewText?: string;
  previewSize?: number;
}

const DEFAULT_PREVIEW_TEXT = 'The quick brown fox jumps over the lazy dog.';
const DEFAULT_PREVIEW_SIZE = 48;

export default function FamilyCard({
  family,
  selected,
  onToggleSelect,
  activeCount,
  activeMode,
  onActivateAll,
  onDeactivateAll,
  previewText,
  previewSize,
}: Props) {
  const isDark = useIsDark();
  const previewBg = isDark ? '09090b' : 'ffffff';
  const previewFg = isDark ? 'fafafa' : '000000';

  const allActive = activeCount > 0 && activeCount === family.variantCount;
  const someActive = activeCount > 0 && activeCount < family.variantCount;

  const variantSummary = summarizeVariants(family);

  const text = previewText ?? DEFAULT_PREVIEW_TEXT;
  const size = previewSize ?? DEFAULT_PREVIEW_SIZE;
  const renderWidth = Math.min(2400, Math.max(600, Math.round(size * Math.max(text.length, 12) * 0.55)));

  return (
    <HoverPreview fontId={family.primaryId} familyName={family.familyName} source={family.source}>
    <div
      className={`group relative rounded-lg overflow-hidden flex flex-col transition-shadow ${
        selected
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-zinc-50 dark:ring-offset-zinc-950 bg-white dark:bg-zinc-900/70'
          : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60'
      }`}
    >
      <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className={`accent-accent shrink-0 transition-opacity ${
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
            }`}
            aria-label={`Select ${family.familyName}`}
          />
        )}
        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded text-accent bg-accent/10 font-semibold">
          {family.variantCount} {family.variantCount === 1 ? 'Style' : 'Styles'}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        <StarButton fontId={family.primaryId} />
        <span
          title={sourceLicense(family.source)}
          className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded cursor-help ${sourceChipClass(family.source)}`}
        >
          {sourceLabel(family.source)}
        </span>
      </div>

      <Link
        to={`/fonts/${family.primaryId}`}
        className="flex-1 flex items-center px-4 pt-10 pb-4"
        style={{ minHeight: Math.max(120, size * 2 + 32) }}
      >
        {family.source === 'system' || family.source === 'user-installed' ? (
          // These fonts live on the user's Mac, not the server. Render via
          // CSS so the browser resolves the family name against locally-
          // installed fonts. Falls back to a placeholder typeface if the
          // viewer's Mac doesn't have it.
          <span
            className="block max-w-full truncate"
            style={{
              fontFamily: `"${family.familyName}", system-ui, sans-serif`,
              fontSize: size,
              lineHeight: 1.2,
              color: isDark ? '#fafafa' : '#000000',
            }}
            title={family.familyName}
          >
            {text}
          </span>
        ) : family.primaryId ? (
          <img
            src={fontPreviewUrl(family.primaryId, {
              text,
              size,
              width: renderWidth,
              bg: previewBg,
              fg: previewFg,
            })}
            alt={family.familyName}
            className="max-w-full h-auto"
            loading="lazy"
          />
        ) : (
          <span className="text-zinc-400 dark:text-zinc-600 text-sm">no binary</span>
        )}
      </Link>

      <div className="border-t border-zinc-200/70 dark:border-zinc-800/60 px-3 py-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/fonts/${family.primaryId}`}
            className="block truncate text-sm font-medium hover:text-zinc-700 dark:hover:text-zinc-200"
            title={family.familyName}
          >
            {family.familyName}
          </Link>
          <div className="text-xs text-zinc-500 truncate" title={variantSummary.full}>
            {variantSummary.short}
            {family.category && <span className="ml-2">· {family.category}</span>}
          </div>
        </div>
        {family.source === 'system' ? (
          <span
            className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0"
            title="Mac OS-protected fonts are always available and can't be activated or deactivated"
          >
            Always on
          </span>
        ) : (
          <ActivationDropdown
            allActive={allActive}
            someActive={someActive}
            activeCount={activeCount}
            activeMode={activeMode}
            total={family.variantCount}
            onActivateTemporary={() => onActivateAll?.('temporary')}
            onActivatePermanent={() => onActivateAll?.('permanent')}
            onDeactivate={onDeactivateAll}
          />
        )}
      </div>
    </div>
    </HoverPreview>
  );
}

function ActivationDropdown({
  allActive,
  someActive,
  activeCount,
  activeMode,
  total,
  onActivateTemporary,
  onActivatePermanent,
  onDeactivate,
}: {
  allActive: boolean;
  someActive: boolean;
  activeCount: number;
  activeMode: ActivationMode | 'mixed' | null;
  total: number;
  onActivateTemporary?: () => void;
  onActivatePermanent?: () => void;
  onDeactivate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = allActive
    ? activeMode === 'temporary'
      ? 'Temporary'
      : activeMode === 'mixed'
        ? 'Mixed'
        : 'Permanent'
    : someActive
      ? `${activeCount}/${total}`
      : 'Inactive';

  // Pill tone follows the activation mode so the bottom-right of each card
  // reads as the activation legend at a glance:
  //   permanent = green, temporary = cyan, mixed = amber, none = neutral.
  const pillTone =
    allActive && activeMode === 'permanent'
      ? 'border-green-500/40 text-green-700 bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50'
      : allActive && activeMode === 'temporary'
        ? 'border-cyan-500/40 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/50'
        : (someActive || activeMode === 'mixed')
          ? 'border-amber-500/40 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50'
          : 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800';

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${pillTone}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ModeDot mode={allActive ? (activeMode === 'mixed' ? 'mixed' : (activeMode ?? null)) : someActive ? 'mixed' : null} />
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full mb-1 min-w-[200px] rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg z-30 py-1 text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem
            onClick={() => {
              onActivateTemporary?.();
              setOpen(false);
            }}
            leftDot="cyan"
            hint="Until app quit"
          >
            Activate for this session
          </MenuItem>
          <MenuItem
            onClick={() => {
              onActivatePermanent?.();
              setOpen(false);
            }}
            leftDot="green"
            hint="Stays on across launches"
          >
            Activate permanently
          </MenuItem>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
          <MenuItem
            disabled={activeCount === 0}
            onClick={() => {
              onDeactivate?.();
              setOpen(false);
            }}
            leftDot="gray"
          >
            Deactivate
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function ModeDot({ mode }: { mode: ActivationMode | 'mixed' | null }) {
  const cls =
    mode === 'permanent'
      ? 'bg-green-500'
      : mode === 'temporary'
        ? 'bg-cyan-500'
        : mode === 'mixed'
          ? 'bg-amber-500'
          : 'bg-zinc-400 dark:bg-zinc-600';
  return <span aria-hidden="true" className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} />;
}

function MenuItem({
  children,
  onClick,
  disabled,
  leftDot,
  hint,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  leftDot?: 'cyan' | 'green' | 'gray';
  hint?: string;
}) {
  const dotCls =
    leftDot === 'cyan' ? 'bg-cyan-500'
      : leftDot === 'green' ? 'bg-green-500'
      : leftDot === 'gray' ? 'bg-zinc-400'
      : '';
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600 disabled:hover:bg-transparent"
    >
      {leftDot && <span aria-hidden="true" className={`inline-block w-1.5 h-1.5 rounded-full ${dotCls}`} />}
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[10px] uppercase tracking-wider text-zinc-500">{hint}</span>}
    </button>
  );
}

// Foundry shorthand → human label. Applied per-token so "Cn Blk Hai" becomes
// "Condensed Black Hairline".
const SHORTHAND: Record<string, string> = {
  cn: 'Condensed', cnd: 'Condensed', cond: 'Condensed',
  blk: 'Black', bl: 'Black',
  bd: 'Bold',
  lt: 'Light',
  md: 'Medium', med: 'Medium',
  rg: 'Regular',
  sb: 'SemiBold',
  hai: 'Hairline',
  thi: 'Thin', th: 'Thin',
  hvy: 'Heavy',
  xbd: 'ExtraBold', xbold: 'ExtraBold', extbd: 'ExtraBold',
  xbk: 'ExtraBlack', xblack: 'ExtraBlack', extbk: 'ExtraBlack',
  xlt: 'ExtraLight', xlight: 'ExtraLight', extlt: 'ExtraLight',
  it: 'Italic', ital: 'Italic',
  obl: 'Oblique',
  cpsd: 'Compressed',
  ext: 'Extended', exp: 'Expanded',
};

function expandShorthand(s: string): string {
  return s
    .split(/\s+/)
    .map((tok) => SHORTHAND[tok.toLowerCase()] ?? tok)
    .join(' ');
}

function variantLabel(rootFamily: string, v: FamilyVariant): string {
  const mod = v.origFamilyName.slice(rootFamily.length).trim();
  const sub = v.subfamily && v.subfamily.toLowerCase() !== 'regular' ? v.subfamily : '';
  const raw = [mod, sub].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  return raw ? expandShorthand(raw) : 'Regular';
}

function summarizeVariants(family: FamilyGroup): { short: string; full: string } {
  const labels = family.variants.map((v) => variantLabel(family.familyName, v));
  const seen = new Set<string>();
  const unique = labels.filter((l) => (seen.has(l) ? false : seen.add(l)));
  const full = unique.join(', ');
  if (unique.length <= 3) return { short: full, full };
  return { short: `${unique.slice(0, 3).join(', ')} +${unique.length - 3} more`, full };
}
