import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listFontFamilies } from '../api/fonts';
import { useIsDark } from '../stores/themeStore';
import { sourceChipClass, sourceLabel } from '../lib/sourceMeta';
import type { Font, FontCategory } from '../api/types';

/**
 * Rules-based "Pairs well with" recommendations on the font detail page.
 *
 * Algorithm: classify the target's category, pick its complementary category,
 * and fetch a small sample with the same source priority (so the team is
 * licensed to use whatever we recommend). The intent is to feel like an
 * editorial suggestion, not an AI black box — the rules are deliberately
 * simple and live in code where they're easy to tweak.
 */

const PAIRING_RULES: Record<FontCategory, { with: FontCategory[]; rationale: string }> = {
  serif: {
    with: ['sans-serif', 'monospace'],
    rationale:
      'Serifs are classic for body text. A clean sans-serif keeps headlines and UI elements legible without competing.',
  },
  'sans-serif': {
    with: ['serif', 'display'],
    rationale:
      'A serif body or a display headline gives a clean sans-serif room to breathe and adds editorial polish.',
  },
  monospace: {
    with: ['sans-serif', 'serif'],
    rationale:
      'Monospaces work hard in code and data UIs. Pair with a humanist sans for prose or a serif for editorial chrome.',
  },
  display: {
    with: ['sans-serif', 'serif'],
    rationale:
      'Display faces are loud. Anchor them with a quiet, well-spaced sans-serif or a workhorse serif for body copy.',
  },
  handwriting: {
    with: ['sans-serif', 'serif'],
    rationale:
      'Casual script needs a calm partner. A neutral sans or restrained serif lets the personality stand out.',
  },
};

export default function FontPairings({ font }: { font: Font }) {
  const isDark = useIsDark();
  const previewColor = isDark ? '#fafafa' : '#000000';

  const rule = font.category ? PAIRING_RULES[font.category] : null;

  const partnerCategory = rule?.with[0];
  const pairingsQ = useQuery({
    queryKey: ['pairings', partnerCategory, font.source],
    queryFn: () =>
      listFontFamilies({
        page: 1,
        pageSize: 4,
        category: partnerCategory!,
        sort: 'name',
      }),
    enabled: !!partnerCategory,
  });

  if (!rule) {
    return (
      <p className="text-sm text-zinc-500">
        Pairing suggestions appear once this font is categorized (serif / sans / monospace / display
        / handwriting).
      </p>
    );
  }

  const families = pairingsQ.data?.data ?? [];

  return (
    <div>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">{rule.rationale}</p>
      {pairingsQ.isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 animate-pulse"
            />
          ))}
        </div>
      ) : families.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">
          No {partnerCategory} fonts in your libraries yet to pair with this one.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {families.map((p) => (
            <li key={`${p.source}:${p.familyName}`}>
              <Link
                to={`/fonts/${p.primaryId}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-950 p-4 transition-colors"
              >
                <div
                  className="text-2xl truncate"
                  style={{
                    fontFamily:
                      p.source === 'system' || p.source === 'user-installed'
                        ? `"${p.familyName}", system-ui, sans-serif`
                        : undefined,
                    color: previewColor,
                  }}
                  title={p.familyName}
                >
                  Ag {p.familyName.slice(0, 8)}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{p.familyName}</div>
                    <div className="text-xs text-zinc-500">
                      {p.variantCount} {p.variantCount === 1 ? 'style' : 'styles'} · {p.category}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${sourceChipClass(p.source)}`}
                  >
                    {sourceLabel(p.source)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
