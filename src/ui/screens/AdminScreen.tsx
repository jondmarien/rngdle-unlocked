import { useCallback, useEffect, useState } from 'react';
import {
  banUser,
  fetchAdminStats,
  listReports,
  patchReport,
  postBroadcast,
  type AdminReportRow,
  type AdminStats,
} from '../../lib/admin-api';
import { useSession } from '../../lib/auth-client';
import { createLogger } from '../../lib/logger';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { AdminUsersTable } from '../components/AdminUsersTable';
import { RelativeTime } from '../components/RollRow';
import { SegmentedToggle } from '../components/SegmentedToggle';

const log = createLogger('admin-ui');

export function AdminScreen({
  onBack,
  onOpenProfile,
}: {
  onBack: () => void;
  onOpenProfile: (username: string) => void;
}) {
  const { data: session, isPending } = useSession();
  const { isAdmin, checking } = useIsAdmin(session?.user?.id);
  const allowed: boolean | null = checking ? null : isAdmin;
  const [tab, setTab] = useState<'broadcast' | 'users' | 'reports'>(
    'broadcast',
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [reports, setReports] = useState<AdminReportRow[]>([]);
  const [reportFilter, setReportFilter] = useState<
    'open' | 'resolved' | 'dismissed'
  >('open');

  const loadReports = useCallback(async () => {
    const res = await listReports(reportFilter);
    if (res.ok) setReports(res.data.reports);
  }, [reportFilter]);

  useEffect(() => {
    if (!allowed) return;
    void fetchAdminStats().then((res) => {
      if (res.ok) setStats(res.data);
    });
  }, [allowed]);

  useEffect(() => {
    if (allowed && tab === 'reports') void loadReports();
  }, [allowed, tab, loadReports]);

  if (isPending || allowed === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center text-sm text-(--prose-2)">
        Checking admin access…
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-(--prose)">
          Forbidden
        </h1>
        <p className="text-sm text-(--prose-2)">
          This area requires an admin session. If you just promoted your
          account, sign out and back in.
        </p>
        <button
          type="button"
          className="rounded-lg border border-(--outline) px-4 py-2 text-sm font-semibold"
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 text-left">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-(--prose-3)">
            Ops
          </p>
          <h1 className="font-display text-2xl font-bold text-(--prose)">
            Admin
          </h1>
          <p className="mt-1 text-sm text-(--prose-2)">
            Session + role gated. Destructive actions are audited.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-(--outline) px-3 py-1.5 text-xs font-semibold"
          onClick={onBack}
        >
          Account
        </button>
      </div>

      {stats && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-b border-(--outline) pb-3 text-xs text-(--prose-2)">
          <span>
            <span className="font-semibold text-(--prose)">{stats.users}</span>{' '}
            users
          </span>
          <span>
            <span className="font-semibold text-(--prose)">{stats.rolls}</span>{' '}
            rolls
          </span>
          <span>
            <span className="font-semibold text-(--prose)">
              {stats.rankedRolls}
            </span>{' '}
            ranked
          </span>
          <span>
            <span className="font-semibold text-(--prose)">
              {stats.arcadeRunsCompleted}
            </span>{' '}
            arcade done
          </span>
          <span>
            <span className="font-semibold text-(--prose)">
              {stats.openReports}
            </span>{' '}
            open reports
          </span>
        </div>
      )}

      <SegmentedToggle
        chipClassName="rounded-md border px-3 py-1.5 text-xs font-semibold"
        options={[
          { id: 'broadcast', label: 'Broadcast' },
          { id: 'users', label: 'Users' },
          { id: 'reports', label: 'Reports' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {msg && (
        <p className="rounded-lg border border-(--outline) bg-(--surface) px-3 py-2 text-sm text-(--prose)">
          {msg}
        </p>
      )}

      {tab === 'broadcast' && (
        <form onSubmit={onBroadcast} className="space-y-3">
          <label className="block text-sm">
            <span className="font-semibold text-(--prose)">Title</span>
            <input
              className="mt-1 w-full rounded-lg border border-(--outline) bg-(--bg) px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold text-(--prose)">Body</span>
            <textarea
              className="mt-1 min-h-32 w-full rounded-lg border border-(--outline) bg-(--bg) px-3 py-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={8000}
              required
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-bold text-(--bg) disabled:opacity-50"
          >
            Send system message
          </button>
        </form>
      )}

      {tab === 'users' && (
        <AdminUsersTable
          busy={busy}
          setBusy={setBusy}
          setMsg={setMsg}
          onOpenProfile={onOpenProfile}
        />
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          <SegmentedToggle
            aria-label="Report status filter"
            chipClassName="rounded-md border px-3 py-1.5 text-xs font-semibold"
            options={[
              { id: 'open', label: 'Open' },
              { id: 'resolved', label: 'Resolved' },
              { id: 'dismissed', label: 'Dismissed' },
            ]}
            value={reportFilter}
            onChange={setReportFilter}
          />
          <ul className="space-y-3">
            {reports.length === 0 ? (
              <li className="text-sm text-(--prose-3)">
                No {reportFilter} reports.
              </li>
            ) : (
              reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-(--outline) bg-(--surface) p-3"
                >
                  <p className="text-sm font-semibold text-(--prose)">
                    @{r.target.username ?? 'unknown'} · reported by @
                    {r.reporter.username ?? 'unknown'}
                  </p>
                  <p className="mt-1 text-sm text-(--prose-2)">{r.reason}</p>
                  <p className="mt-1 text-xs text-(--prose-3)">
                    <RelativeTime iso={r.createdAt} />
                  </p>
                  {reportFilter === 'open' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-11 rounded-md border border-(--outline) px-3 py-1.5 text-xs font-semibold"
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
                        className="min-h-11 rounded-md border border-(--outline) px-3 py-1.5 text-xs font-semibold"
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
                      <button
                        type="button"
                        disabled={busy}
                        className="min-h-11 rounded-md border border-red-600/40 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Ban @${r.target.username ?? r.target.id} and resolve this report?`,
                            )
                          ) {
                            return;
                          }
                          setBusy(true);
                          const ban = await banUser(
                            r.target.id,
                            true,
                            `Report: ${r.reason.slice(0, 200)}`,
                          );
                          if (!ban.ok) {
                            setBusy(false);
                            setMsg(ban.error);
                            return;
                          }
                          const res = await patchReport(r.id, 'resolved');
                          setBusy(false);
                          if (res.ok) {
                            setMsg(`Banned @${r.target.username ?? 'user'}`);
                            void loadReports();
                            void fetchAdminStats().then((s) => {
                              if (s.ok) setStats(s.data);
                            });
                          } else setMsg(res.error);
                        }}
                      >
                        Ban + resolve
                      </button>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
