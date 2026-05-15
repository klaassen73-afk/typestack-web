import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { fontPreviewUrl } from '../api/client';
import { useIsDark } from '../stores/themeStore';

interface Props {
  /** Font id used to fetch the server-rendered preview (local/google/adobe). */
  fontId: string;
  /** Family name used as the CSS font-family for system / user-installed. */
  familyName: string;
  /** Source affects whether we use server PNG or browser CSS rendering. */
  source: 'local' | 'adobe' | 'google' | 'system' | 'user-installed';
  /** What gets the hover — usually the FamilyCard root. */
  children: ReactNode;
}

const HOVER_DELAY_MS = 280;

/**
 * Lazy hover preview. Renders the same family at large size in a portal
 * positioned next to the hovered card. Designed not to fight the cursor:
 *   • 280ms intent delay so flick-throughs don't fire it
 *   • Closes immediately when the hover leaves both anchor and panel
 *   • Uses CSS font-family for OS-installed fonts (so users see the real face
 *     they have on disk), server PNG otherwise
 *   • Pointer events disabled on the panel itself so we don't trap hover focus
 */
export default function HoverPreview({ fontId, familyName, source, children }: Props) {
  const isDark = useIsDark();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; arm: 'right' | 'left' } | null>(null);

  const onEnter = (): void => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = setTimeout(() => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const panelWidth = 480;
      const gap = 12;
      // Prefer right side; fall back to left if too close to the viewport edge.
      const rightSpace = window.innerWidth - rect.right;
      const arm: 'right' | 'left' = rightSpace > panelWidth + gap ? 'right' : 'left';
      const left = arm === 'right' ? rect.right + gap : rect.left - panelWidth - gap;
      const top = Math.max(16, Math.min(window.innerHeight - 220, rect.top));
      setPos({ top, left, arm });
      setOpen(true);
    }, HOVER_DELAY_MS);
  };

  const onLeave = (): void => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
    enterTimer.current = null;
    setOpen(false);
  };

  useEffect(() => () => {
    if (enterTimer.current) clearTimeout(enterTimer.current);
  }, []);

  const cssRender = source === 'system' || source === 'user-installed';

  return (
    <div
      ref={anchorRef}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {children}
      {open && pos && createPortal(
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[55] w-[480px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl px-5 py-4 animate-[fadeIn_140ms_ease-out]"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
            {familyName}
          </div>
          {cssRender ? (
            <div
              className="overflow-hidden"
              style={{
                fontFamily: `"${familyName}", system-ui, sans-serif`,
                color: isDark ? '#fafafa' : '#0a0a0a',
                fontSize: 64,
                lineHeight: 1.05,
              }}
            >
              Ag
              <div style={{ fontSize: 18, marginTop: 6, lineHeight: 1.3 }}>
                The quick brown fox jumps over the lazy dog.
              </div>
            </div>
          ) : (
            <img
              src={fontPreviewUrl(fontId, {
                text: 'Ag — The quick brown fox',
                size: 56,
                width: 880,
                bg: isDark ? '09090b' : 'ffffff',
                fg: isDark ? 'fafafa' : '0a0a0a',
              })}
              alt=""
              loading="eager"
              className="w-full h-auto"
            />
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
