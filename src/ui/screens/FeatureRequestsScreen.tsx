import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  FEATURE_STATUS_LABELS,
  fetchFeatureRequests,
  patchFeatureRequestStatus,
  submitFeatureRequest,
  upvoteFeatureRequest,
  type FeatureRequestItem,
  type FeatureRequestSort,
  type FeatureRequestStatus,
} from '../../lib/feature-requests-api';
import { formatDateTime, formatRelative } from '../../lib/format';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedToggle } from '../components/SegmentedToggle';

const STATUS_OPTIONS = Object.keys(
  FEATURE_STATUS_LABELS,
) as FeatureRequestStatus[];

const ACTIVE_STATUSES = new Set<FeatureRequestStatus>([
  'submitted',
  'under_review',
  'planned',
  'in_progress',
]);

/** Dedicated --feature-* tokens (not rarity). */
function statusAccentVar(status: FeatureRequestStatus): string {
  switch (status) {
    case 'submitted':
      return '--feature-submitted';
    case 'under_review':
      return '--feature-review';
    case 'planned':
      return '--feature-planned';
    case 'in_progress':
      return '--feature-progress';
    case 'shipped':
      return '--feature-shipped';
    case 'declined':
      return '--feature-declined';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusGlyph(status: FeatureRequestStatus): string {
  switch (status) {
    case 'shipped':
      return '✓ ';
    case 'declined':
      return '· ';
    default:
      return '';
  }
}

function asStatus(raw: string): FeatureRequestStatus {
  if (raw in FEATURE_STATUS_LABELS) return raw as FeatureRequestStatus;
  return 'submitted';
}

function FeatureRequestCard({
  item,
  isAdmin,
  votePending,
  statusPending,
  onVote,
  onStatus,
}: {
  item: FeatureRequestItem;
  isAdmin: boolean;
  votePending: boolean;
  statusPending: boolean;
  onVote: (id: string) => void;
  onStatus: (id: string, status: FeatureRequestStatus) => void;
}) {
  const status = asStatus(item.status);
  const accent = `var(${statusAccentVar(status)})`;
  const closed = status === 'shipped' || status === 'declined';
  const relative =
    formatRelative(item.createdAt) ?? formatDateTime(item.createdAt);
  const submitter = item.username ? `@${item.username}` : item.name;

  return (
    <li
      className={`relative space-y-2 overflow-hidden px-3 py-3 ${
        closed ? 'opacity-85' : ''
      }`}
    >
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex flex-wrap items-start justify-between gap-2 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[var(--prose)]">{item.title}</h3>
            <span
              className="rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
              style={{
                borderColor: `color-mix(in srgb, ${accent} 45%, var(--outline))`,
                color: accent,
                backgroundColor: `color-mix(in srgb, ${accent} 12%, var(--surface))`,
              }}
            >
              {statusGlyph(status)}
              {FEATURE_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--prose-2)]">
            {item.description}
          </p>
          <p className="mt-1 text-[11px] text-[var(--prose-3)]">
            <span>{submitter}</span>
            {' · '}
            <time
              dateTime={item.createdAt}
              title={formatDateTime(item.createdAt)}
            >
              {relative}
            </time>
          </p>
          {isAdmin && (
            <label className="mt-2 block text-xs font-semibold text-[var(--prose-3)]">
              Status
              <select
                className="ml-2 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--prose)]"
                value={status}
                disabled={statusPending}
                onChange={(e) =>
                  onStatus(item.id, e.target.value as FeatureRequestStatus)
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {FEATURE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {closed ? (
          <div
            className="flex min-w-14 flex-col items-center rounded-md border border-[var(--outline)] px-2 py-1.5 text-sm font-bold text-[var(--prose-3)]"
            title="Final upvote count"
          >
            <span aria-hidden>▲</span>
            <span>{item.voteCount}</span>
          </div>
        ) : (
          <button
            type="button"
            disabled={item.votedByMe || votePending}
            onClick={() => onVote(item.id)}
            className={`flex min-w-14 flex-col items-center rounded-md border px-2 py-1.5 text-sm font-bold ${
              item.votedByMe
                ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-[var(--outline)] text-[var(--prose)] hover:border-[var(--prose)]'
            }`}
            title={item.votedByMe ? 'Already voted' : 'Upvote'}
          >
            <span aria-hidden>▲</span>
            <span>{item.voteCount}</span>
          </button>
        )}
      </div>
    </li>
  );
}

function RequestList({
  items,
  emptyCopy,
  isAdmin,
  votePending,
  statusPending,
  onVote,
  onStatus,
}: {
  items: FeatureRequestItem[];
  emptyCopy: string;
  isAdmin: boolean;
  votePending: boolean;
  statusPending: boolean;
  onVote: (id: string) => void;
  onStatus: (id: string, status: FeatureRequestStatus) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-3 text-sm text-[var(--prose-3)]">{emptyCopy}</p>
    );
  }
  return (
    <ul className="divide-y divide-[var(--outline)] overflow-hidden rounded-lg border border-[var(--outline)]">
      {items.map((item) => (
        <FeatureRequestCard
          key={item.id}
          item={item}
          isAdmin={isAdmin}
          votePending={votePending}
          statusPending={statusPending}
          onVote={onVote}
          onStatus={onStatus}
        />
      ))}
    </ul>
  );
}

export function FeatureRequestsScreen({
  onGoAccount,
}: {
  onGoAccount: () => void;
}) {
  const { data: session } = useSession();
  const { isAdmin } = useIsAdmin(session?.user?.id);
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<FeatureRequestSort>('top');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [openShipped, setOpenShipped] = useState(false);
  const [openDeclined, setOpenDeclined] = useState(false);

  const listQuery = useQuery({
    queryKey: ['feature-requests', sort],
    queryFn: ({ signal }) => fetchFeatureRequests({ sort, limit: 50, signal }),
    enabled: Boolean(session?.user),
  });

  const submitMutation = useMutation({
    mutationFn: submitFeatureRequest,
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFormError(null);
      void queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
    onError: (err) => {
      setFormError(err instanceof Error ? err.message : 'Submit failed');
    },
  });

  const voteMutation = useMutation({
    mutationFn: (id: string) => upvoteFeatureRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['feature-requests', sort] });
      const prev = queryClient.getQueryData<{
        items: FeatureRequestItem[];
        sort: FeatureRequestSort;
      }>(['feature-requests', sort]);
      if (prev) {
        queryClient.setQueryData(['feature-requests', sort], {
          ...prev,
          items: prev.items.map((item) =>
            item.id === id && !item.votedByMe
              ? {
                  ...item,
                  votedByMe: true,
                  voteCount: item.voteCount + 1,
                }
              : item,
          ),
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(['feature-requests', sort], ctx.prev);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: FeatureRequestStatus;
    }) => patchFeatureRequestStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
  });

  const items = listQuery.data?.items ?? [];
  const buckets = useMemo(() => {
    const active: FeatureRequestItem[] = [];
    const shipped: FeatureRequestItem[] = [];
    const declined: FeatureRequestItem[] = [];
    for (const item of items) {
      const s = asStatus(item.status);
      if (s === 'shipped') shipped.push(item);
      else if (s === 'declined') declined.push(item);
      else if (ACTIVE_STATUSES.has(s)) active.push(item);
      else active.push(item);
    }
    return { active, shipped, declined };
  }, [items]);

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Features</h1>
          <p className="text-sm text-[var(--prose-2)]">
            Sign in to browse feature requests, upvote ideas, and submit your
            own.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoAccount}
          className="rounded-md border border-[var(--prose)] bg-[var(--prose)] px-3 py-2 text-sm font-semibold text-[var(--bg)]"
        >
          Sign in
        </button>
      </div>
    );
  }

  const listProps = {
    isAdmin: Boolean(isAdmin),
    votePending: voteMutation.isPending,
    statusPending: statusMutation.isPending,
    onVote: (id: string) => voteMutation.mutate(id),
    onStatus: (id: string, status: FeatureRequestStatus) =>
      statusMutation.mutate({ id, status }),
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Features</h1>
        <p className="text-sm text-[var(--prose-2)]">
          Suggest improvements and upvote what you want next. Admins update
          status as ideas move through review.
        </p>
      </div>

      <form
        className="space-y-2 rounded-lg border border-[var(--outline)] p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          submitMutation.mutate({ title, description });
        }}
      >
        <h2 className="text-sm font-bold">Submit a request</h2>
        <label className="block text-xs font-semibold text-[var(--prose-2)]">
          Title
          <input
            type="text"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--prose)]"
            placeholder="Short summary"
            required
          />
        </label>
        <label className="block text-xs font-semibold text-[var(--prose-2)]">
          Description
          <textarea
            value={description}
            maxLength={2000}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2.5 py-2 text-sm text-[var(--prose)]"
            placeholder="What should we add or change?"
            required
          />
        </label>
        {formError && (
          <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
        )}
        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="rounded-md border border-[var(--prose)] bg-[var(--prose)] px-3 py-1.5 text-sm font-semibold text-[var(--bg)] disabled:opacity-60"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </form>

      <SegmentedToggle
        options={[
          { id: 'top', label: 'Top' },
          { id: 'newest', label: 'Newest' },
        ]}
        value={sort}
        onChange={setSort}
      />

      {listQuery.isPending && (
        <p className="text-sm text-[var(--prose-2)]">Loading…</p>
      )}
      {listQuery.error && (
        <p className="text-sm text-red-700 dark:text-red-400">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : 'Failed'}
        </p>
      )}

      {!listQuery.isPending && !listQuery.error && (
        <div className="space-y-5">
          <section className="space-y-2">
            <h2 className="text-base font-bold text-[var(--prose)]">
              Active requests
              <span className="ml-2 text-sm font-normal text-[var(--prose-2)]">
                ({buckets.active.length})
              </span>
            </h2>
            <RequestList
              items={buckets.active}
              emptyCopy="No active requests — submit one above."
              {...listProps}
            />
          </section>

          <section className="space-y-2">
            <SectionHeader
              title="Shipped"
              meta={`(${buckets.shipped.length})`}
              open={openShipped}
              onToggle={() => setOpenShipped((v) => !v)}
            />
            {openShipped && (
              <RequestList
                items={buckets.shipped}
                emptyCopy="Nothing shipped yet."
                {...listProps}
              />
            )}
          </section>

          <section className="space-y-2">
            <SectionHeader
              title="Declined"
              meta={`(${buckets.declined.length})`}
              open={openDeclined}
              onToggle={() => setOpenDeclined((v) => !v)}
            />
            {openDeclined && (
              <RequestList
                items={buckets.declined}
                emptyCopy="No declined requests."
                {...listProps}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
