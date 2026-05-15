import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminStats,
  getUserLibraryAccess,
  grantUserLibraryAccess,
  listAdminUsers,
  revokeUserLibraryAccess,
  updateAdminUser,
} from '../api/admin';
import { importFonts } from '../api/fonts';
import { getAdobeStatus, getGoogleStatus, triggerGoogleSync } from '../api/integrations';
import { formatBytes, formatRelative } from '../lib/format';
import type { UserRole } from '../api/types';

const card = 'rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30';
const input =
  'bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-600';
const primaryBtn =
  'bg-zinc-900 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white text-sm px-3 py-1.5 rounded-md disabled:opacity-50';
const ghostBtn =
  'bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs px-2 py-1 rounded disabled:opacity-50';

export default function Admin() {
  return (
    <div className="p-6 space-y-6">
      <StatsPanel />
      <IntegrationsPanel />
      <ImportPanel />
      <UsersPanel />
    </div>
  );
}

function StatsPanel() {
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'stats'], queryFn: getAdminStats });
  if (isLoading || !data) return <p className="text-zinc-500 text-sm">Loading stats…</p>;
  return (
    <section>
      <h2 className="text-xl font-light mb-3">Library</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Stat label="Total fonts" value={data.totalFonts.toLocaleString()} />
        <Stat label="Local" value={data.fontsBySource.local.toLocaleString()} />
        <Stat label="Adobe" value={data.fontsBySource.adobe.toLocaleString()} />
        <Stat label="Google" value={data.fontsBySource.google.toLocaleString()} />
        <Stat label="Libraries" value={data.totalCollections.toLocaleString()} />
        <Stat label="Users" value={data.totalUsers.toLocaleString()} />
        <Stat label="Active sessions" value={data.activeSessionsCount.toLocaleString()} />
        <Stat label="Storage" value={formatBytes(data.storageBytes)} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} p-3`}>
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-2xl font-light mt-1">{value}</div>
    </div>
  );
}

function IntegrationsPanel() {
  const qc = useQueryClient();
  const adobeQ = useQuery({ queryKey: ['integrations', 'adobe'], queryFn: getAdobeStatus });
  const googleQ = useQuery({ queryKey: ['integrations', 'google'], queryFn: getGoogleStatus });
  const syncMut = useMutation({
    mutationFn: (limit?: number) => triggerGoogleSync(limit),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations', 'google'] }),
  });
  return (
    <section>
      <h2 className="text-xl font-light mb-3">Integrations</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className={`${card} p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm">Adobe Fonts</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {adobeQ.data?.count ?? 0} fonts · {adobeQ.data?.withBinaries ?? 0} with binaries
              </div>
            </div>
            <span className="text-xs text-zinc-500">{formatRelative(adobeQ.data?.lastSyncedAt)}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-3">
            Adobe entries are populated from desktop scans of <code>livetype/.r/</code>. Preview-only —
            never registered with system CoreText.
          </p>
        </div>
        <div className={`${card} p-4`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm">Google Fonts</div>
              <div className="text-xs text-zinc-500 mt-0.5">
                {googleQ.data?.count ?? 0} fonts {googleQ.data?.inProgress && '· syncing…'}
              </div>
            </div>
            <span className="text-xs text-zinc-500">{formatRelative(googleQ.data?.lastSyncedAt)}</span>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => syncMut.mutate(50)}
              disabled={syncMut.isPending || googleQ.data?.inProgress}
              className={ghostBtn}
            >
              Sync 50
            </button>
            <button
              onClick={() => syncMut.mutate(undefined)}
              disabled={syncMut.isPending || googleQ.data?.inProgress}
              className="bg-zinc-900 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white text-xs px-2 py-1 rounded disabled:opacity-50"
            >
              Sync all (~1500)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const importMut = useMutation({
    mutationFn: (files: File[]) => importFonts(files),
    onSuccess: (r) => setStatus(`Queued ${r.fileCount} file(s) — job ${r.jobId.slice(0, 8)}…`),
    onError: (err) => setStatus(err instanceof Error ? err.message : String(err)),
  });

  return (
    <section>
      <h2 className="text-xl font-light mb-3">Import local fonts</h2>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter((f) =>
            /\.(ttf|otf|woff|woff2|ttc)$/i.test(f.name),
          );
          if (files.length > 0) importMut.mutate(files);
        }}
        className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-8 text-center bg-zinc-50 dark:bg-zinc-900/20"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Drop .ttf, .otf, .woff, .woff2, or .ttc files here, or{' '}
          <button
            onClick={() => inputRef.current?.click()}
            className="underline hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            choose files
          </button>
          .
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) importMut.mutate(Array.from(e.target.files));
          }}
        />
      </div>
      {status && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">{status}</p>}
    </section>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: listAdminUsers });
  const [creating, setCreating] = useState(false);
  const [openAccessFor, setOpenAccessFor] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setCreating(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateAdminUser(id, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAdminUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-light">Users</h2>
        <button onClick={() => setCreating((s) => !s)} className={primaryBtn}>
          {creating ? 'Cancel' : 'New user'}
        </button>
      </div>

      {creating && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            createMut.mutate({
              email: String(fd.get('email')),
              name: String(fd.get('name')),
              password: String(fd.get('password')),
              role: (fd.get('role') as UserRole) ?? 'user',
            });
          }}
          className={`${card} p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-2`}
        >
          <input name="email" type="email" required placeholder="email" className={input} />
          <input name="name" required placeholder="name" className={input} />
          <input name="password" type="password" required minLength={8} placeholder="password" className={input} />
          <div className="flex gap-2">
            <select name="role" className={`flex-1 ${input}`}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
            <button type="submit" disabled={createMut.isPending} className={primaryBtn}>
              Add
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-zinc-500 uppercase tracking-wider">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left">Email</th>
              <th className="text-left">Role</th>
              <th className="text-left">Last seen</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).flatMap((u) => {
              const open = openAccessFor === u.id;
              return [
                <tr
                  key={u.id}
                  className="border-t border-zinc-200/70 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
                >
                  <td className="py-2">{u.name}</td>
                  <td className="text-zinc-600 dark:text-zinc-400">{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateMut.mutate({ id: u.id, role: e.target.value as UserRole })}
                      className="bg-white border border-zinc-300 dark:bg-zinc-950 dark:border-zinc-800 rounded px-2 py-1 text-xs"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="text-zinc-500 text-xs">{formatRelative(u.lastSeenAt)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => setOpenAccessFor((id) => (id === u.id ? null : u.id))}
                      className="text-xs text-accent hover:underline mr-3"
                    >
                      {open ? 'Hide access' : 'Library access'}
                    </button>
                    <button
                      onClick={() => confirm(`Delete ${u.email}?`) && deleteMut.mutate(u.id)}
                      className="text-xs text-zinc-500 hover:text-red-600 dark:hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>,
                open ? (
                  <tr key={`${u.id}-access`} className="border-t border-zinc-200/70 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/30">
                    <td colSpan={5} className="p-3">
                      <LibraryAccessEditor userId={u.id} userLabel={`${u.name} (${u.email})`} />
                    </td>
                  </tr>
                ) : null,
              ].filter(Boolean);
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LibraryAccessEditor({ userId, userLabel }: { userId: string; userLabel: string }) {
  const qc = useQueryClient();
  const accessQ = useQuery({
    queryKey: ['admin', 'users', userId, 'library-access'],
    queryFn: () => getUserLibraryAccess(userId),
  });

  const grantMut = useMutation({
    mutationFn: (collectionId: string) => grantUserLibraryAccess(userId, collectionId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId, 'library-access'] }),
  });

  const revokeMut = useMutation({
    mutationFn: (collectionId: string) => revokeUserLibraryAccess(userId, collectionId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['admin', 'users', userId, 'library-access'] }),
  });

  if (accessQ.isLoading) {
    return <p className="text-xs text-zinc-500">Loading access for {userLabel}…</p>;
  }
  if (!accessQ.data) {
    return <p className="text-xs text-zinc-500">Couldn’t load access.</p>;
  }

  const rows = accessQ.data.rows;
  if (rows.length === 0) {
    return (
      <p className="text-xs text-zinc-500 italic">
        No collections exist yet — create one and you can grant {userLabel} access here.
      </p>
    );
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
        Library access · {userLabel}
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {rows.map((r) => {
          const c = r.collection;
          const isOwner = r.relation === 'owner';
          const isMember = r.relation === 'member';
          const checked = isOwner || isMember;
          return (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1.5"
            >
              <label className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isOwner || grantMut.isPending || revokeMut.isPending}
                  onChange={(e) => {
                    if (e.target.checked) grantMut.mutate(c.id);
                    else revokeMut.mutate(c.id);
                  }}
                />
                <span className="truncate" title={c.name}>{c.name}</span>
                <span className="text-xs text-zinc-500 shrink-0">
                  ({c.fontCount.toLocaleString()} fonts)
                </span>
              </label>
              {isOwner && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                  owner
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-zinc-500 mt-2">
        Owner relationships cannot be revoked here. Members can be toggled on or off freely.
      </p>
    </div>
  );
}
