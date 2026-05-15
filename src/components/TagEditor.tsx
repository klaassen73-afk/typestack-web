import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { addFontTag, listTags, removeFontTag } from '../api/tags';
import { toast } from './Toast';

/**
 * Inline tag editor for the font detail page. Auto-suggests from existing tags
 * across the library so the team's taxonomy converges instead of fragmenting.
 */
export default function TagEditor({
  fontId,
  initialTags,
}: {
  fontId: string;
  initialTags: string[];
}) {
  const qc = useQueryClient();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState('');

  const allTagsQ = useQuery({ queryKey: ['tags'], queryFn: listTags });
  const knownTags = (allTagsQ.data?.data ?? []).map((t) => t.tag);
  const suggestions = draft
    ? knownTags.filter(
        (t) => t.includes(draft.trim().toLowerCase()) && !tags.includes(t),
      ).slice(0, 6)
    : [];

  const addMut = useMutation({
    mutationFn: (tag: string) => addFontTag(fontId, tag),
    onSuccess: (data) => {
      setTags(data.tags);
      setDraft('');
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err) => toast.error('Could not add tag', err instanceof Error ? err.message : String(err)),
  });

  const removeMut = useMutation({
    mutationFn: (tag: string) => removeFontTag(fontId, tag),
    onSuccess: (data) => {
      setTags(data.tags);
      qc.invalidateQueries({ queryKey: ['tags'] });
    },
    onError: (err) => toast.error('Could not remove tag', err instanceof Error ? err.message : String(err)),
  });

  const commit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (tags.includes(v.toLowerCase())) {
      setDraft('');
      return;
    }
    addMut.mutate(v);
  };

  return (
    <div>
      <h2 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Tags</h2>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 text-xs rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1"
          >
            <Link to={`/fonts?tag=${encodeURIComponent(t)}`} className="hover:underline">
              {t}
            </Link>
            <button
              aria-label={`Remove tag ${t}`}
              onClick={() => removeMut.mutate(t)}
              className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit(draft);
            } else if (e.key === 'Backspace' && !draft && tags.length > 0) {
              e.preventDefault();
              removeMut.mutate(tags[tags.length - 1]);
            }
          }}
          placeholder={tags.length === 0 ? 'Add tag…' : '+'}
          className="bg-transparent text-xs focus:outline-none placeholder:text-zinc-500 w-24"
          aria-label="Add tag"
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                onClick={() => commit(s)}
                className="text-[11px] rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-0.5 hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
