import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
} from '@tanstack/react-table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  banUser,
  searchAdminUsers,
  wipeUser,
  type AdminUserRow,
} from '../../lib/admin-api';

const columnHelper = createColumnHelper<AdminUserRow>();

export function AdminUsersTable({
  busy,
  setBusy,
  setMsg,
}: {
  busy: boolean;
  setBusy: (v: boolean) => void;
  setMsg: (v: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [debouncedQuery]);

  const listQuery = useQuery({
    queryKey: [
      'admin-users',
      debouncedQuery,
      pagination.pageIndex,
      pagination.pageSize,
    ],
    queryFn: async () => {
      const res = await searchAdminUsers(debouncedQuery, {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    placeholderData: keepPreviousData,
  });

  const users = listQuery.data?.users ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize) || 1);

  const onWipe = useCallback(
    async (u: AdminUserRow) => {
      const ok = window.confirm(
        `Wipe cloud progress + rolls for @${u.username ?? u.email}? Auth account stays.`,
      );
      if (!ok) return;
      setBusy(true);
      const res = await wipeUser(u.id);
      setBusy(false);
      setMsg(res.ok ? `Wiped ${u.username ?? u.email}` : res.error);
      if (res.ok) void listQuery.refetch();
    },
    [listQuery, setBusy, setMsg],
  );

  const onBan = useCallback(
    async (u: AdminUserRow, banned: boolean) => {
      const reason = banned
        ? (window.prompt('Ban reason (optional):') ?? undefined)
        : undefined;
      setBusy(true);
      const res = await banUser(u.id, banned, reason);
      setBusy(false);
      setMsg(
        res.ok
          ? `${banned ? 'Banned' : 'Unbanned'} ${u.username ?? u.email}`
          : res.error,
      );
      if (res.ok) void listQuery.refetch();
    },
    [listQuery, setBusy, setMsg],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', {
        header: 'User',
        cell: (info) => {
          const u = info.row.original;
          return (
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
            </div>
          );
        },
      }),
      columnHelper.accessor('lifetimeEp', {
        header: 'Progress',
        cell: (info) => {
          const u = info.row.original;
          return (
            <span className="text-xs text-[var(--prose-2)]">
              {u.lifetimeEp.toLocaleString()} EP ·{' '}
              {u.lifetimeRollCount.toLocaleString()} rolls
            </span>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex flex-wrap justify-end gap-2">
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
          );
        },
      }),
    ],
    [busy, onBan, onWipe],
  );

  const table = useReactTable({
    data: users,
    columns,
    pageCount,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="sr-only">Filter users</span>
        <input
          className="w-full rounded-lg border border-[var(--outline)] bg-[var(--bg)] px-3 py-2 text-sm"
          placeholder="Filter email, @username, name, or id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {listQuery.isPending && !listQuery.data && (
        <p className="text-sm text-[var(--prose-2)]">Loading users…</p>
      )}
      {listQuery.error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed to load users'}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--outline)]">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead className="border-b border-[var(--outline)] bg-[var(--surface-raised)] text-xs uppercase tracking-wide text-[var(--prose-3)]">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-[var(--prose-3)]"
                >
                  {listQuery.isFetching ? 'Loading…' : 'No users found.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--outline)] last:border-0"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--prose-2)]">
        <p>
          {total.toLocaleString()} user{total === 1 ? '' : 's'}
          {listQuery.isFetching ? ' · updating…' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1">
            Rows
            <select
              className="rounded-md border border-[var(--outline)] bg-[var(--bg)] px-2 py-1"
              value={pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-[var(--outline)] px-2 py-1 font-semibold disabled:opacity-40"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
          >
            First
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--outline)] px-2 py-1 font-semibold disabled:opacity-40"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prev
          </button>
          <span className="font-semibold text-[var(--prose)]">
            Page {pagination.pageIndex + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="rounded-md border border-[var(--outline)] px-2 py-1 font-semibold disabled:opacity-40"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
          <button
            type="button"
            className="rounded-md border border-[var(--outline)] px-2 py-1 font-semibold disabled:opacity-40"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
