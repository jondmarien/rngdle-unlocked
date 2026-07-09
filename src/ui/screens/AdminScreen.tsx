import { useCallback, useEffect, useState } from 'react';
import {
  banUser,
  listReports,
  patchReport,
  postBroadcast,
  searchAdminUsers,
  wipeUser,
  type AdminReportRow,
  type AdminUserRow,
} from '../../lib/admin-api';
import { useSession } from '../../lib/auth-client';
import { createLogger } from '../../lib/logger';

const log = createLogger('admin-ui');

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const { data: session, isPending } = useSession();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'broadcast' | 'users' | 'reports'>('broadcast');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);

  const [reports, setReports] = useState<AdminReportRow[]>([]);

  const probeAdmin = useCallback(async () => {
    const res = await fetch('/api/admin/broadcast', { credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      setAllowed(false);
      return;
    }
    setAllowed(res.ok || res.status === 405);
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      setAllowed(false);
      return;
    }
    void probeAdmin();
  }, [isPending, session?.user, probeAdmin]);

  const loadReports = useCallback(async () => {
    const res = await listReports('open');
    if (res.ok) setReports(res.data.reports);
  }, []);

  useEffect(() => {
    if (allowed && tab === 'reports') void loadReports();
  }, [allowed, tab, loadReports]);

  if (isPending || allowed === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-[var(--prose-2)]">
        Checking admin access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--prose)]">
          Forbidden
        </h1>
        <p className="text-sm text-[var(--prose-2)]">
          This area requires an admin session. If you just promoted your account,
          sign out and back in.
        </p>
        <button
          type="button"
          className="rounded-lg border border-[var(--outline)] px-4 py-2 text-sm font-semibold"
          onClick={onBack}
        >
          Back to Account
        </button>
      </div>
    );
  }

  const onBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await postBroadcast(title, body);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      return;
    }
    setTitle('');
    setBody('');
    setMsg(`Broadcast sent (${res.data.id.slice(0, 8)}…)`);
    log.info('broadcast ok');
  };

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await searchAdminUsers(query);
    setBusy(false);
    if (!res.ok) {
      setMsg(res.error);
      setUsers([]);
      return;
    }
    setUsers(res.data.users);
  };

  const onWipe = async (u: AdminUserRow) => {
    const ok = window.confirm(
      `Wipe cloud progress + rolls for @${u.username ?? u.email}? Auth account stays.`,
    );
    if (!ok) return;
    setBusy(true);
    const res = await wipeUser(u.id);
    setBusy(false);
    setMsg(res.ok ? `Wiped ${u.username ?? u.email}` : res.error);
  };

  const onBan = async (u: AdminUserRow, banned: boolean) => {
    const reason = banned
      ? window.prompt('Ban reason (optional):') ?? undefined
      : undefined;
    setBusy(true);
    const res = await banUser(u.id, banned, reason);
    setBusy(false);
    setMsg(
      res.ok
        ? `${banned ? 'Banned' : 'Unbanned'} ${u.username ?? u.email}`
        : res.error,
    );
    if (res.ok) {
      setUsers((prev) =>
        prev.map((row) =>
          row.id === u.id ? { ...row, banned, banReason: reason ?? null } : row,
        ),
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--prose-3)]">
            Ops
          </p>
          <h1 className="font-display text-2xl font-bold text-[var(--prose)]">
            Admin
          </h1>
          <p className="mt-1 text-sm text-[var(--prose-2)]">
            Session + role gated. Destructive actions are audited.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[var(--outline)] px-3 py-1.5 text-xs font-semibold"
          onClick={onBack}
        >
          Account
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['broadcast', 'Broadcast'],
            ['users', 'Users'],
            ['reports', 'Reports'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              tab === id
                ? 'bg-[var(--prose)] text-[var(--bg)]'
                : 'border border-[var(--outline)] text-[var(--prose-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <p className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--prose)]">
          {msg}
        </p>
      )}

      {tab === 'broadcast' && (
        <form onSubmit={onBroadcast} className="space-y-3">
          <label className="block text-sm">
            <span className="font-semibold text-[var(--prose)]">Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-[var(--outline)] bg-[var(--bg)] px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-[var(--prose)]">Body</span>
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg border border-[var(--outline)] bg-[var(--bg)] px-3 py-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[var(--prose)] px-4 py-2 text-sm font-bold text-[var(--bg)] disabled:opacity-50"
          >
            Send system message
          </button>
        </form>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <form onSubmit={onSearch} className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-lg border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
              placeholder="Search email, @username, or id"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              minLength={2}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--prose)] px-4 py-2 text-sm font-bold text-[var(--bg)] disabled:opacity-50"
            >
              Search
            </button>
          </form>
          <ul className="space-y-3">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[var(--prose)]">
                      {u.username ? `@${u.username}` : u.name}
                      {u.banned && (
                        <span className="ml-2 text-xs font-bold text-rose-600">
                          BANNED
                        </span>
                      )}
                      {u.role === 'admin' && (
                        <span className="ml-2 text-xs font-bold text-amber-600">
                          ADMIN
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--prose-3)]">{u.email}</p>
                    <p className="mt-1 text-xs text-[var(--prose-2)]">
                      {u.lifetimeEp.toLocaleString()} EP ·{' '}
                      {u.lifetimeRollCount.toLocaleString()} rolls
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || u.role === 'admin'}
                      className="rounded-md border border-[var(--outline)] px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      onClick={() => void onBan(u, !u.banned)}
                    >
                      {u.banned ? 'Unban' : 'Ban'}
                    </button>
                    <button
                      type="button"
                      disabled={busy || u.role === 'admin'}
                      className="rounded-md border border-rose-500/50 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-400 disabled:opacity-40"
                      onClick={() => void onWipe(u)}
                    >
                      Wipe cloud
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'reports' && (
        <ul className="space-y-3">
          {reports.length === 0 ? (
            <li className="text-sm text-[var(--prose-3)]">No open reports.</li>
          ) : (
            reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3"
              >
                <p className="text-sm font-semibold text-[var(--prose)]">
                  @{r.target.username ?? 'unknown'} · reported by @
                  {r.reporter.username ?? 'unknown'}
                </p>
                <p className="mt-1 text-sm text-[var(--prose-2)]">{r.reason}</p>
                <p className="mt-1 text-[10px] text-[var(--prose-3)]">
                  {r.createdAt}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--outline)] px-2 py-1 text-xs font-semibold"
                    onClick={async () => {
                      setBusy(true);
                      const res = await patchReport(r.id, 'resolved');
                      setBusy(false);
                      if (res.ok) void loadReports();
                      else setMsg(res.error);
                    }}
                  >
                    Resolve
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-md border border-[var(--outline)] px-2 py-1 text-xs font-semibold"
                    onClick={async () => {
                      setBusy(true);
                      const res = await patchReport(r.id, 'dismissed');
                      setBusy(false);
                      if (res.ok) void loadReports();
                      else setMsg(res.error);
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
