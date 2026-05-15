import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listFavorites, starFont, unstarFont } from '../api/favorites';
import { toast } from './Toast';

/**
 * Shared favorites state. Backed by react-query so we get one fetch and one
 * cache key shared across every card and the sidebar count. Mutations update
 * optimistically — the star flips instantly even before the server responds.
 */
export function useFavorites() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
    staleTime: 60_000,
  });
  const ids = q.data?.data ?? [];
  const set = new Set(ids);

  const starMut = useMutation({
    mutationFn: starFont,
    onMutate: async (fontId: string) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<{ data: string[] }>(['favorites']);
      qc.setQueryData(['favorites'], {
        data: prev ? Array.from(new Set([fontId, ...prev.data])) : [fontId],
      });
      return { prev };
    },
    onError: (err, _fontId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev);
      toast.error('Couldn’t star font', err instanceof Error ? err.message : String(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const unstarMut = useMutation({
    mutationFn: unstarFont,
    onMutate: async (fontId: string) => {
      await qc.cancelQueries({ queryKey: ['favorites'] });
      const prev = qc.getQueryData<{ data: string[] }>(['favorites']);
      qc.setQueryData(['favorites'], {
        data: prev ? prev.data.filter((id) => id !== fontId) : [],
      });
      return { prev };
    },
    onError: (err, _fontId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev);
      toast.error('Couldn’t unstar font', err instanceof Error ? err.message : String(err));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  });

  return {
    favorites: set,
    count: ids.length,
    isLoading: q.isLoading,
    toggle: (fontId: string, currentlyStarred: boolean) => {
      if (currentlyStarred) unstarMut.mutate(fontId);
      else starMut.mutate(fontId);
    },
    star: (fontId: string) => starMut.mutate(fontId),
    unstar: (fontId: string) => unstarMut.mutate(fontId),
  };
}

export default function StarButton({
  fontId,
  size = 16,
  className = '',
}: {
  fontId: string;
  size?: number;
  className?: string;
}) {
  const { favorites, toggle } = useFavorites();
  const starred = favorites.has(fontId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(fontId, starred);
      }}
      aria-label={starred ? 'Unstar font' : 'Star font'}
      aria-pressed={starred}
      title={starred ? 'Starred — click to unstar' : 'Star this font'}
      className={`inline-flex items-center justify-center rounded-md p-1 transition-colors ${
        starred
          ? 'text-amber-500 hover:text-amber-600'
          : 'text-zinc-400 hover:text-amber-500 dark:text-zinc-600 dark:hover:text-amber-400'
      } ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={starred ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 2.5l2.95 6.7 7.3.65-5.55 4.85L18.4 22 12 17.9 5.6 22l1.7-7.3L1.75 9.85l7.3-.65L12 2.5z" />
      </svg>
    </button>
  );
}
