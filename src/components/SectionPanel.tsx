import type { ReactNode } from 'react';

/**
 * Shared visual primitive for the labeled side-panels on the library detail
 * page (Auto-activation rules, Members, etc.). Used to converge on a single
 * spacing/typography rhythm so the page feels systemized.
 */
export default function SectionPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-zinc-200/70 dark:border-zinc-800/60 pt-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h2 className="text-base font-medium tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div>{children}</div>
    </section>
  );
}
