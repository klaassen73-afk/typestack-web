import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { listCollections, addFontToCollection } from '../api/collections';

interface Props {
  fontIds: string[];
  onDone?: () => void;
}

export default function CollectionPicker({ fontIds, onDone }: Props) {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: listCollections,
  });
  const addMut = useMutation({
    mutationFn: async (collectionId: string) => {
      setBusyId(collectionId);
      for (const fontId of fontIds) {
        await addFontToCollection(collectionId, fontId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      onDone?.();
    },
    onSettled: () => setBusyId(null),
  });

  if (isLoading) return <p className="text-sm text-zinc-500 p-3">Loading…</p>;
  const collections = data?.data ?? [];

  return (
    <div className="w-64 bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-md shadow-xl overflow-hidden">
      <div className="px-3 py-2 text-xs uppercase tracking-wider text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
        Add {fontIds.length} font{fontIds.length === 1 ? '' : 's'} to…
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {collections.length === 0 && (
          <li className="px-3 py-2 text-sm text-zinc-500">No libraries yet.</li>
        )}
        {collections.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => addMut.mutate(c.id)}
              disabled={busyId === c.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 flex items-center justify-between"
            >
              <span className="truncate">{c.name}</span>
              <span className="text-xs text-zinc-500 ml-2">{c.fontCount}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
