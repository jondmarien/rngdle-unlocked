import { useCallback, useEffect, useState } from 'react';
import {
  listReports,
  patchReport,
  postBroadcast,
  type AdminReportRow,
} from '../../lib/admin-api';
import { useSession } from '../../lib/auth-client';
import { createLogger } from '../../lib/logger';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { AdminUsersTable } from '../components/AdminUsersTable';
import { SegmentedToggle } from '../components/SegmentedToggle';

const log = createLogger('admin-ui');

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const { data: session, isPending } = useSession();
  const { isAdmin, checking } = useIsAdmin(session?.user?.id);
  const allowed: boolean | null = checking ? null : isAdmin;
  const [tab, setTab] = useState<'broadcast' | 'users' | 'reports'>(
    'broadcast',
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const [reports, setReports] = useState<AdminReportRow[]>([]);

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
          This area requires an admin session. If you just promoted your
          account, sign out and back in.
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
        <AdminUsersTable busy={busy} setBusy={setBusy} setMsg={setMsg} />
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
