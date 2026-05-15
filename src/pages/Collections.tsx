import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  activateCollection,
  addCollectionMember,
  createCollection,
  deactivateCollection,
  deleteCollection,
  exportCollection,
  getCollection,
  listCollectionMembers,
  listCollections,
  removeCollectionMember,
  removeFontFromCollection,
  updateCollection,
} from '../api/collections';
import {
  COMMON_CREATIVE_APPS,
  createAutoActivationRule,
  deleteAutoActivationRule,
  listAutoActivationRulesForCollection,
  updateAutoActivationRule,
} from '../api/autoActivation';
import { toast } from '../components/Toast';
import type { AutoActivationRule, CollectionFontEntry } from '../api/types';
import { fontPreviewUrl } from '../api/client';
import { useIsDark } from '../stores/themeStore';
import { useAuthStore } from '../stores/authStore';

const inputClass =
  'mt-1 w-full bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600';
const primaryBtn =
  'text-sm bg-zinc-900 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white px-3 py-1.5 rounded-md disabled:opacity-50';
const ghostBtn =
  'text-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-3 py-1.5 rounded-md';
const cardClass =
  'rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30';

export default function Collections() {
  const { id } = useParams();
  return id ? <CollectionDetail id={id} /> : <CollectionsList />;
}

function CollectionsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Sidebar's "+ Create library" links here with ?new=1 to auto-open the form.
  const [creating, setCreating] = useState(searchParams.get('new') === '1');
  const { data, isLoading } = useQuery({ queryKey: ['collections'], queryFn: listCollections });

  const createMut = useMutation({
    mutationFn: createCollection,
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success(`Library “${c.name}” created`);
      navigate(`/libraries/${c.id}`);
    },
    onError: (err) => toast.error('Could not create library', err instanceof Error ? err.message : String(err)),
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createMut.mutateAsync({
      name: String(fd.get('name')),
      description: (fd.get('description') as string) || null,
    });
    setCreating(false);
  };

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight">Libraries</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">
            Save the fonts you actually use. Personal libraries are private to you — share one with
            a teammate from inside the library to make it a team library.
          </p>
        </div>
        <button
          onClick={() => {
            setCreating((s) => !s);
            if (searchParams.has('new')) {
              searchParams.delete('new');
              setSearchParams(searchParams, { replace: true });
            }
          }}
          className={primaryBtn}
        >
          {creating ? 'Cancel' : '+ New personal library'}
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className={`${cardClass} p-5 mb-5 space-y-4 max-w-xl`}>
          <div>
            <div className="text-base font-medium">New personal library</div>
            <p className="text-sm text-zinc-500 mt-1">
              A private place to save your favorite fonts. Only you can see it until you share it
              with teammates from the library page.
            </p>
          </div>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">Name</span>
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. My picks, Project Aurora, Brand R&D"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              Description <span className="text-zinc-400 normal-case tracking-normal">(optional)</span>
            </span>
            <textarea
              name="description"
              rows={2}
              placeholder="What this collection is for — visible to anyone you share it with."
              className={inputClass}
            />
          </label>
          <div className="flex items-center gap-2 pt-1">
            <button type="submit" disabled={createMut.isPending} className={primaryBtn}>
              {createMut.isPending ? 'Creating…' : 'Create library'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className={ghostBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-28 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 animate-pulse" />
          ))}
        </ul>
      ) : (data?.data ?? []).length === 0 ? (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl py-16 px-6 text-center">
          <div className="text-4xl text-zinc-300 dark:text-zinc-700 mb-3" aria-hidden="true">+</div>
          <h3 className="text-lg font-light tracking-tight">Save your favorite fonts</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
            A personal library is a private list of fonts you reach for often. Add fonts from the
            browser, activate them together, or pin them to apps like Adobe InDesign so they switch
            on automatically.
          </p>
          <button onClick={() => setCreating(true)} className={`${primaryBtn} mt-4`}>
            Create your first library
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {(data?.data ?? []).map((c) => (
            <li key={c.id}>
              <Link
                to={`/libraries/${c.id}`}
                className="block rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60 p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    {c.description && (
                      <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  {c.memberCount > 0 ? (
                    <span
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent/10 text-accent shrink-0"
                      title={`Shared with ${c.memberCount} ${c.memberCount === 1 ? 'person' : 'people'}`}
                    >
                      Shared
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                      Private
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-3">
                  {c.fontCount.toLocaleString()} {c.fontCount === 1 ? 'font' : 'fonts'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CollectionDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => getCollection(id),
  });
  const [items, setItems] = useState<CollectionFontEntry[] | null>(null);
  const fonts = items ?? data?.fonts ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const removeMut = useMutation({
    mutationFn: (fontId: string) => removeFontFromCollection(id, fontId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', id] }),
  });

  const activateMut = useMutation({
    mutationFn: () => activateCollection(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      toast.success(`Activated ${r.activated.length} ${r.activated.length === 1 ? 'font' : 'fonts'}`);
    },
    onError: (err) => toast.error('Activation failed', err instanceof Error ? err.message : String(err)),
  });

  const deactivateMut = useMutation({
    mutationFn: () => deactivateCollection(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['activation', 'state'] });
      toast.success(`Deactivated ${r.deactivated.length} ${r.deactivated.length === 1 ? 'font' : 'fonts'}`);
    },
    onError: (err) => toast.error('Deactivation failed', err instanceof Error ? err.message : String(err)),
  });

  const updateMut = useMutation({
    mutationFn: (input: { name?: string; description?: string | null }) =>
      updateCollection(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', id] }),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCollection(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Library deleted');
      navigate('/libraries');
    },
    onError: (err) => toast.error('Delete failed', err instanceof Error ? err.message : String(err)),
  });

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = fonts.findIndex((f) => f.id === active.id);
    const newIndex = fonts.findIndex((f) => f.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(arrayMove(fonts, oldIndex, newIndex));
  };

  if (isLoading || !data) return <p className="p-6 text-zinc-500">Loading…</p>;

  return (
    <div className="p-6">
      <Link to="/libraries" className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
        ← All libraries
      </Link>
      <div className="flex items-start justify-between mt-1 mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight">{data.name}</h1>
          {data.description && <p className="text-sm text-zinc-500 mt-1">{data.description}</p>}
          <div className="text-xs text-zinc-500 mt-2 flex gap-3 items-center">
            <span>{fonts.length} {fonts.length === 1 ? 'font' : 'fonts'}</span>
            <span
              className={`uppercase tracking-wider px-1.5 py-0.5 rounded ${
                data.memberCount > 0
                  ? 'bg-accent/10 text-accent'
                  : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
              title={
                data.memberCount > 0
                  ? `Shared with ${data.memberCount} ${data.memberCount === 1 ? 'person' : 'people'}`
                  : 'Visible only to you'
              }
            >
              {data.memberCount > 0 ? 'Shared' : 'Private'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => activateMut.mutate()} disabled={activateMut.isPending} className={primaryBtn}>
            {activateMut.isPending ? 'Activating…' : 'Activate all'}
          </button>
          <button onClick={() => deactivateMut.mutate()} disabled={deactivateMut.isPending} className={ghostBtn}>
            Deactivate all
          </button>
          <span className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" aria-hidden="true" />
          <a
            href={exportCollection(id, 'zip')}
            className={ghostBtn}
            title="Download a ZIP with every binary plus a manifest.json"
          >
            Download ZIP
          </a>
          <a
            href={exportCollection(id, 'css')}
            className={ghostBtn}
            title="Export an @font-face stylesheet"
          >
            Export CSS
          </a>
          <a
            href={exportCollection(id, 'json')}
            className={ghostBtn}
            title="Export the library manifest"
          >
            Export JSON
          </a>
          <span className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" aria-hidden="true" />
          <button
            onClick={() => {
              if (confirm(`Delete library "${data.name}"? This can’t be undone.`)) {
                deleteMut.mutate();
              }
            }}
            className="text-sm bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60 px-3 py-1.5 rounded-md"
          >
            Delete
          </button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fonts.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-1">
            {fonts.length === 0 && (
              <li className="text-sm text-zinc-500 py-6 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg">
                No fonts yet — find some in <Link to="/fonts" className="text-zinc-700 dark:text-zinc-300 underline">the browser</Link> and add them here.
              </li>
            )}
            {fonts.map((f) => (
              <SortableRow key={f.id} font={f} onRemove={() => removeMut.mutate(f.id)} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <AutoActivationRulesPanel collectionId={id} />

      <MembersPanel collectionId={id} ownerUserId={data.ownerUserId} />

      <details className="mt-6 text-sm text-zinc-500">
        <summary className="cursor-pointer">Rename library</summary>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateMut.mutate({
              name: String(fd.get('name')),
              description: (fd.get('description') as string) || null,
            });
          }}
          className="mt-2 space-y-2 max-w-md"
        >
          <input name="name" defaultValue={data.name} className={inputClass} />
          <textarea
            name="description"
            defaultValue={data.description ?? ''}
            placeholder="Description (optional)"
            rows={2}
            className={inputClass}
          />
          <button type="submit" disabled={updateMut.isPending} className={primaryBtn}>
            Save
          </button>
        </form>
      </details>
    </div>
  );
}

function MembersPanel({
  collectionId,
  ownerUserId,
}: {
  collectionId: string;
  ownerUserId: string;
}) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const isOwnerOrAdmin = me ? me.role === 'admin' || me.id === ownerUserId : false;

  const membersQ = useQuery({
    queryKey: ['collection', collectionId, 'members'],
    queryFn: () => listCollectionMembers(collectionId),
  });

  const addMut = useMutation({
    mutationFn: (email: string) => addCollectionMember(collectionId, email),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', collectionId, 'members'] }),
  });

  const removeMut = useMutation({
    mutationFn: (userId: string) => removeCollectionMember(collectionId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection', collectionId, 'members'] }),
  });

  const members = membersQ.data?.members ?? [];

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-medium">Shared with</h2>
        <span className="text-xs text-zinc-500">
          {members.length === 0 ? 'Just the owner' : `${members.length} member${members.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {isOwnerOrAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const email = String(fd.get('email') || '').trim();
            if (!email) return;
            addMut.mutate(email, {
              onSuccess: () => {
                (e.target as HTMLFormElement).reset();
              },
              onError: (err) => {
                alert(err instanceof Error ? err.message : 'Failed to add member');
              },
            });
          }}
          className="flex gap-2 mb-3 max-w-md"
        >
          <input
            name="email"
            type="email"
            required
            placeholder="user@typestack.local"
            className={`flex-1 ${inputClass}`}
          />
          <button
            type="submit"
            disabled={addMut.isPending}
            className="text-sm bg-accent text-accent-fg hover:bg-accent-strong px-3 py-1.5 rounded-md disabled:opacity-50"
          >
            {addMut.isPending ? 'Adding…' : 'Add'}
          </button>
        </form>
      )}

      {membersQ.isLoading ? (
        <p className="text-sm text-zinc-500">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3 italic">
          {isOwnerOrAdmin
            ? 'Add a user above to share this library with them.'
            : 'No additional members.'}
        </p>
      ) : (
        <ul className="space-y-1 max-w-md">
          {members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between text-sm px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30"
            >
              <div className="min-w-0">
                <div className="truncate">{m.name}</div>
                <div className="text-xs text-zinc-500 truncate">{m.email}</div>
              </div>
              {isOwnerOrAdmin && (
                <button
                  onClick={() => {
                    if (confirm(`Remove ${m.email} from this library?`)) removeMut.mutate(m.userId);
                  }}
                  className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-2"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AutoActivationRulesPanel({ collectionId }: { collectionId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [presetIdx, setPresetIdx] = useState(0);
  const [customBundle, setCustomBundle] = useState('');
  const [customApp, setCustomApp] = useState('');

  const rulesQ = useQuery({
    queryKey: ['collection', collectionId, 'auto-activation-rules'],
    queryFn: () => listAutoActivationRulesForCollection(collectionId),
  });

  const addMut = useMutation({
    mutationFn: (input: { bundleId: string; appName: string | null }) =>
      createAutoActivationRule(collectionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection', collectionId, 'auto-activation-rules'] });
      setAdding(false);
      setCustomBundle('');
      setCustomApp('');
      setPresetIdx(0);
    },
    onError: (err) => {
      alert(err instanceof Error ? err.message : 'Failed to add rule');
    },
  });

  const toggleMut = useMutation({
    mutationFn: (vars: { ruleId: string; enabled: boolean }) =>
      updateAutoActivationRule(vars.ruleId, { enabled: vars.enabled }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['collection', collectionId, 'auto-activation-rules'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (ruleId: string) => deleteAutoActivationRule(ruleId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['collection', collectionId, 'auto-activation-rules'] }),
  });

  const rules: AutoActivationRule[] = rulesQ.data?.data ?? [];

  // -1 means "custom" — show the free-form bundleId/appName inputs.
  const isCustom = presetIdx === -1;

  const handleAdd = () => {
    if (isCustom) {
      const bundleId = customBundle.trim();
      if (!bundleId) return;
      const appName = customApp.trim() || null;
      addMut.mutate({ bundleId, appName });
    } else {
      const preset = COMMON_CREATIVE_APPS[presetIdx];
      addMut.mutate({ bundleId: preset.bundleId, appName: preset.appName });
    }
  };

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-medium">Auto-activate when these apps are frontmost</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Fonts in this collection are activated temporarily while a listed app is in front, then
            removed when you switch away. Your manual activations are never touched.
          </p>
        </div>
        <button onClick={() => setAdding((s) => !s)} className={ghostBtn}>
          {adding ? 'Cancel' : 'Add app'}
        </button>
      </div>

      {adding && (
        <div className={`${cardClass} p-3 mb-3 max-w-xl space-y-2`}>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-zinc-500">App</span>
            <select
              value={presetIdx}
              onChange={(e) => setPresetIdx(Number(e.target.value))}
              className={inputClass}
            >
              {COMMON_CREATIVE_APPS.map((p, i) => (
                <option key={p.bundleId} value={i}>
                  {p.appName} <span className="text-zinc-500">({p.bundleId})</span>
                </option>
              ))}
              <option value={-1}>Custom bundle ID…</option>
            </select>
          </label>

          {isCustom && (
            <>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Bundle ID (reverse-DNS, e.g. com.adobe.InDesign)
                </span>
                <input
                  value={customBundle}
                  onChange={(e) => setCustomBundle(e.target.value)}
                  className={inputClass}
                  placeholder="com.example.app"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-zinc-500">
                  Display name (optional)
                </span>
                <input
                  value={customApp}
                  onChange={(e) => setCustomApp(e.target.value)}
                  className={inputClass}
                  placeholder="Example App"
                />
              </label>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={addMut.isPending || (isCustom && !customBundle.trim())}
              className={primaryBtn}
            >
              {addMut.isPending ? 'Adding…' : 'Add rule'}
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">
            Tip: To find a bundle ID for a Mac app, run{' '}
            <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
              osascript -e 'id of app "App Name"'
            </code>{' '}
            in Terminal.
          </p>
        </div>
      )}

      {rulesQ.isLoading ? (
        <p className="text-sm text-zinc-500">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3 italic">
          No auto-activation rules yet. Add an app above to have these fonts switched on
          automatically when you focus that app.
        </p>
      ) : (
        <ul className="space-y-1 max-w-xl">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between text-sm px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30"
            >
              <div className="min-w-0">
                <div className="truncate">{r.appName ?? r.bundleId}</div>
                <div className="text-xs text-zinc-500 truncate">{r.bundleId}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={(e) =>
                      toggleMut.mutate({ ruleId: r.id, enabled: e.target.checked })
                    }
                  />
                  {r.enabled ? 'On' : 'Off'}
                </label>
                <button
                  onClick={() => {
                    if (confirm(`Remove auto-activation for ${r.appName ?? r.bundleId}?`)) {
                      deleteMut.mutate(r.id);
                    }
                  }}
                  className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-2"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-zinc-500 mt-3">
        Auto-activation requires the TypeStack desktop app to be running and signed in. Web users
        can manage the rules here; they take effect on the next app switch.
      </p>
    </section>
  );
}

function SortableRow({ font, onRemove }: { font: CollectionFontEntry; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: font.id,
  });
  const isDark = useIsDark();
  const previewBg = isDark ? '09090b' : 'ffffff';
  const previewFg = isDark ? 'fafafa' : '000000';
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 px-3 py-2 rounded-md border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/60"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-zinc-400 hover:text-zinc-700 dark:text-zinc-600 dark:hover:text-zinc-300"
        aria-label="Drag"
      >
        ⋮⋮
      </button>
      {font.filePath ? (
        <img
          src={fontPreviewUrl(font.id, {
            text: font.familyName,
            size: 24,
            width: 280,
            bg: previewBg,
            fg: previewFg,
          })}
          alt={font.familyName}
          className="h-7 rounded"
          loading="lazy"
        />
      ) : (
        <span className="h-7 px-2 inline-flex items-center text-zinc-500 text-xs">no binary</span>
      )}
      <div className="min-w-0 flex-1">
        <Link to={`/fonts/${font.id}`} className="text-sm hover:text-zinc-700 dark:hover:text-zinc-300">
          {font.familyName}
        </Link>
        <span className="text-zinc-500 text-xs ml-2">{font.subfamily}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-500">{font.source}</span>
      <button onClick={onRemove} className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1">
        Remove
      </button>
    </li>
  );
}
