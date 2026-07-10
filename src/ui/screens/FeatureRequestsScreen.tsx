import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSession } from '../../lib/auth-client';
import { formatDateTime } from '../../lib/format';
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
import { useIsAdmin } from '../../lib/useIsAdmin';
import { SegmentedToggle } from '../components/SegmentedToggle';

const STATUS_OPTIONS = Object.keys(
  FEATURE_STATUS_LABELS,
) as FeatureRequestStatus[];

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

  const items = listQuery.data?.items ?? [];

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
        className="space-y-2 border border-[var(--outline)] p-3"
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
      {!listQuery.isPending && items.length === 0 && !listQuery.error && (
        <p className="text-sm text-[var(--prose-2)]">
          No requests yet — be the first to submit one.
        </p>
      )}

      <ul className="divide-y divide-[var(--outline)] border border-[var(--outline)]">
        {items.map((item) => (
          <li key={item.id} className="space-y-2 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{item.title}</h3>
                  <span className="rounded border border-[var(--outline)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--prose-2)]">
                    {FEATURE_STATUS_LABELS[
                      item.status as FeatureRequestStatus
                    ] ?? item.status}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--prose-2)]">
                  {item.description}
                </p>
                <p className="mt-1 text-[11px] text-[var(--prose-3)]">
                  {item.username ? `@${item.username}` : item.name}
                  {' · '}
                  {formatDateTime(item.createdAt)}
                </p>
              </div>
              <button
                type="button"
                disabled={item.votedByMe || voteMutation.isPending}
                onClick={() => voteMutation.mutate(item.id)}
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
            </div>
            {isAdmin && (
              <label className="block text-xs font-semibold text-[var(--prose-2)]">
                Admin status
                <select
                  className="ml-2 rounded-md border border-[var(--outline)] bg-[var(--surface)] px-2 py-1 text-sm"
                  value={item.status}
                  disabled={statusMutation.isPending}
                  onChange={(e) =>
                    statusMutation.mutate({
                      id: item.id,
                      status: e.target.value as FeatureRequestStatus,
                    })
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
          </li>
        ))}
      </ul>
    </div>
  );
}
