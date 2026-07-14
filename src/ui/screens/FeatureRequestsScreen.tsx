import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSession } from '../../lib/auth-client';
import {
  deleteFeatureRequestAdmin,
  editFeatureRequest,
  FEATURE_STATUS_LABELS,
  fetchFeatureRequests,
  patchFeatureRequestStatus,
  submitFeatureRequest,
  uploadFeatureRequestImage,
  upvoteFeatureRequest,
  type FeatureRequestItem,
  type FeatureRequestSort,
  type FeatureRequestStatus,
} from '../../lib/feature-requests-api';
import {
  FEATURE_REQUEST_TAGS,
  FEATURE_TAG_LABELS,
  featureTagAccentVar,
  featureTagLabel,
  isFeatureRequestTag,
  type FeatureRequestTag,
} from '../../lib/feature-request-tags';
import { formatDateTime, formatRelative } from '../../lib/format';
import { useIsAdmin } from '../../lib/useIsAdmin';
import { QueryErrorBanner } from '../components/QueryErrorBanner';
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
  deletePending,
  editPending,
  onVote,
  onStatus,
  onDelete,
  onEdit,
}: {
  item: FeatureRequestItem;
  isAdmin: boolean;
  votePending: boolean;
  statusPending: boolean;
  deletePending: boolean;
  editPending: boolean;
  onVote: (id: string) => void;
  onStatus: (id: string, status: FeatureRequestStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    patch: {
      title: string;
      description: string;
      tag: FeatureRequestTag | null;
    },
  ) => void | Promise<unknown>;
}) {
  const status = asStatus(item.status);
  const accent = `var(${statusAccentVar(status)})`;
  const tag = isFeatureRequestTag(item.tag) ? item.tag : null;
  const tagAccent = `var(${featureTagAccentVar(tag)})`;
  const closed = status === 'shipped' || status === 'declined';
  const relative =
    formatRelative(item.createdAt) ?? formatDateTime(item.createdAt);
  const submitter = item.username ? `@${item.username}` : item.name;
  const canEdit = Boolean(item.isMine) || isAdmin;
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDesc, setEditDesc] = useState(item.description);
  const [editTag, setEditTag] = useState<FeatureRequestTag | ''>(tag ?? '');

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
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editTitle}
                maxLength={200}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-md border border-(--outline) bg-(--surface) px-2 py-1.5 text-sm font-bold text-(--prose)"
              />
              <div className="flex flex-wrap gap-1.5">
                {FEATURE_REQUEST_TAGS.map((t) => {
                  const selected = editTag === t;
                  const a = `var(${featureTagAccentVar(t)})`;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditTag(t)}
                      className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        borderColor: selected
                          ? a
                          : `color-mix(in srgb, ${a} 35%, var(--outline))`,
                        color: a,
                        backgroundColor: selected
                          ? `color-mix(in srgb, ${a} 22%, var(--surface))`
                          : undefined,
                      }}
                      aria-pressed={selected}
                    >
                      {FEATURE_TAG_LABELS[t]}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={editDesc}
                maxLength={2000}
                rows={3}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full rounded-md border border-(--outline) bg-(--surface) px-2 py-1.5 text-sm text-(--prose)"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={editPending}
                  className="rounded-md border border-(--accent) bg-(--accent) px-2 py-1 text-xs font-semibold text-(--bg)"
                  onClick={() => {
                    void Promise.resolve(
                      onEdit(item.id, {
                        title: editTitle,
                        description: editDesc,
                        tag: editTag || null,
                      }),
                    ).then(() => setEditing(false));
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="rounded-md border border-(--outline) px-2 py-1 text-xs font-semibold text-(--prose-2)"
                  onClick={() => {
                    setEditTitle(item.title);
                    setEditDesc(item.description);
                    setEditTag(tag ?? '');
                    setEditing(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-(--prose)">{item.title}</h3>
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
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    borderColor: `color-mix(in srgb, ${tagAccent} 50%, var(--outline))`,
                    color: tagAccent,
                    backgroundColor: `color-mix(in srgb, ${tagAccent} 14%, var(--surface))`,
                  }}
                >
                  {featureTagLabel(tag)}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-(--prose-2)">
                {item.description}
              </p>
              {item.imageUrl ? (
                <a
                  href={item.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block max-w-xs"
                >
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="max-h-28 w-auto rounded-md border border-(--outline) object-cover"
                  />
                </a>
              ) : null}
            </>
          )}
          <p className="mt-1 text-[11px] text-(--prose-3)">
            <span>{submitter}</span>
            {' · '}
            <time
              dateTime={item.createdAt}
              title={formatDateTime(item.createdAt)}
            >
              {relative}
            </time>
          </p>
          {(canEdit || isAdmin) && !editing && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  className="rounded-md border border-(--outline) px-2 py-1 text-xs font-semibold text-(--prose-2) hover:text-(--prose)"
                  onClick={() => {
                    setEditTitle(item.title);
                    setEditDesc(item.description);
                    setEditTag(tag ?? '');
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              )}
              {isAdmin && (
                <>
                  <label className="text-xs font-semibold text-(--prose-3)">
                    Status
                    <select
                      className="ml-2 rounded-md border border-(--outline) bg-(--surface) px-2 py-1 text-sm text-(--prose)"
                      value={status}
                      disabled={statusPending}
                      onChange={(e) =>
                        onStatus(
                          item.id,
                          e.target.value as FeatureRequestStatus,
                        )
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {FEATURE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    disabled={deletePending}
                    className="rounded-md border border-red-600/40 px-2 py-1 text-xs font-semibold text-red-700 dark:text-red-400"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Permanently delete “${item.title.slice(0, 60)}”?`,
                        )
                      ) {
                        onDelete(item.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {closed ? (
          <div
            className="flex min-w-14 flex-col items-center rounded-md border border-(--outline) px-2 py-1.5 text-sm font-bold text-(--prose-3)"
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
            className={`flex min-h-11 min-w-14 flex-col items-center justify-center rounded-md border px-2 py-1.5 text-sm font-bold ${
              item.votedByMe
                ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-(--outline) text-(--prose) hover:border-(--accent) hover:text-(--accent)'
            }`}
            title={item.votedByMe ? 'Already voted' : 'Upvote'}
            aria-label={
              item.votedByMe
                ? `Already voted, ${item.voteCount} votes`
                : `Upvote, ${item.voteCount} votes`
            }
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
  deletePending,
  editPending,
  onVote,
  onStatus,
  onDelete,
  onEdit,
}: {
  items: FeatureRequestItem[];
  emptyCopy: string;
  isAdmin: boolean;
  votePending: boolean;
  statusPending: boolean;
  deletePending: boolean;
  editPending: boolean;
  onVote: (id: string) => void;
  onStatus: (id: string, status: FeatureRequestStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (
    id: string,
    patch: {
      title: string;
      description: string;
      tag: FeatureRequestTag | null;
    },
  ) => void | Promise<unknown>;
}) {
  if (items.length === 0) {
    return <p className="px-1 py-3 text-sm text-(--prose-3)">{emptyCopy}</p>;
  }
  return (
    <ul className="divide-y divide-(--outline) overflow-hidden rounded-lg border border-(--outline)">
      {items.map((item) => (
        <FeatureRequestCard
          key={item.id}
          item={item}
          isAdmin={isAdmin}
          votePending={votePending}
          statusPending={statusPending}
          deletePending={deletePending}
          editPending={editPending}
          onVote={onVote}
          onStatus={onStatus}
          onDelete={onDelete}
          onEdit={onEdit}
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
  const [search, setSearch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState<FeatureRequestTag | ''>('new_feature');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
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
      setTag('new_feature');
      setImageUrl(null);
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFeatureRequestAdmin(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
  });

  const editMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        title: string;
        description: string;
        tag: FeatureRequestTag | null;
      };
    }) => editFeatureRequest(id, patch),
    retry: false,
    onSuccess: () => {
      setEditError(null);
      void queryClient.invalidateQueries({ queryKey: ['feature-requests'] });
    },
    onError: (err) => {
      const msg = err instanceof Error ? err.message : 'Edit failed';
      setEditError(msg);
    },
  });

  const items = listQuery.data?.items ?? [];
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q),
    );
  }, [items, search]);
  const buckets = useMemo(() => {
    const active: FeatureRequestItem[] = [];
    const shipped: FeatureRequestItem[] = [];
    const declined: FeatureRequestItem[] = [];
    for (const item of filteredItems) {
      const s = asStatus(item.status);
      if (s === 'shipped') shipped.push(item);
      else if (s === 'declined') declined.push(item);
      else if (ACTIVE_STATUSES.has(s)) active.push(item);
      else active.push(item);
    }
    return { active, shipped, declined };
  }, [filteredItems]);

  if (!session?.user) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Features</h1>
          <p className="text-sm text-(--prose-2)">
            Sign in to browse feature requests, upvote ideas, and submit your
            own.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoAccount}
          className="rounded-md border border-(--accent) bg-(--accent) px-3 py-2 text-sm font-semibold text-(--bg)"
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
    deletePending: deleteMutation.isPending,
    editPending: editMutation.isPending,
    onVote: (id: string) => voteMutation.mutate(id),
    onStatus: (id: string, status: FeatureRequestStatus) =>
      statusMutation.mutate({ id, status }),
    onDelete: (id: string) => deleteMutation.mutate(id),
    onEdit: (
      id: string,
      patch: {
        title: string;
        description: string;
        tag: FeatureRequestTag | null;
      },
    ) => {
      setEditError(null);
      return editMutation.mutateAsync({ id, patch });
    },
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Features</h1>
        <p className="text-sm text-(--prose-2)">
          Suggest improvements and upvote what you want next. Admins update
          status as ideas move through review.
        </p>
        {editError && (
          <p
            className="mt-2 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {editError}
          </p>
        )}
      </div>

      <form
        className="space-y-2 rounded-lg border border-(--outline) p-3"
        onSubmit={(e) => {
          e.preventDefault();
          setFormError(null);
          submitMutation.mutate({
            title,
            description,
            tag: tag || null,
            imageUrl,
          });
        }}
      >
        <h2 className="text-sm font-bold">Submit a request</h2>
        <label className="block text-xs font-semibold text-(--prose-2)">
          Title
          <input
            type="text"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-(--outline) bg-(--surface) px-2.5 py-2 text-sm text-(--prose)"
            placeholder="Short summary"
            required
          />
        </label>
        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-(--prose-2)">
            Category
          </legend>
          <div className="flex flex-wrap gap-1.5">
            {FEATURE_REQUEST_TAGS.map((t) => {
              const selected = tag === t;
              const accent = `var(${featureTagAccentVar(t)})`;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: selected
                      ? accent
                      : `color-mix(in srgb, ${accent} 35%, var(--outline))`,
                    color: accent,
                    backgroundColor: selected
                      ? `color-mix(in srgb, ${accent} 22%, var(--surface))`
                      : `color-mix(in srgb, ${accent} 8%, var(--surface))`,
                  }}
                  aria-pressed={selected}
                >
                  {FEATURE_TAG_LABELS[t]}
                </button>
              );
            })}
          </div>
        </fieldset>
        <label className="block text-xs font-semibold text-(--prose-2)">
          Description
          <textarea
            value={description}
            maxLength={2000}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-md border border-(--outline) bg-(--surface) px-2.5 py-2 text-sm text-(--prose)"
            placeholder="What should we add or change?"
            required
          />
        </label>
        <label className="block text-xs font-semibold text-(--prose-2)">
          Screenshot (optional, max 2MB)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="mt-1 block w-full text-sm text-(--prose-2)"
            disabled={uploadBusy || submitMutation.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setFormError(null);
              setUploadBusy(true);
              void uploadFeatureRequestImage(file)
                .then(({ url }) => setImageUrl(url))
                .catch((err) =>
                  setFormError(
                    err instanceof Error ? err.message : 'Upload failed',
                  ),
                )
                .finally(() => setUploadBusy(false));
            }}
          />
        </label>
        {imageUrl && (
          <div className="flex items-start gap-2">
            <img
              src={imageUrl}
              alt=""
              className="max-h-24 rounded-md border border-(--outline) object-cover"
            />
            <button
              type="button"
              className="text-xs font-semibold text-(--prose-3) underline"
              onClick={() => setImageUrl(null)}
            >
              Remove
            </button>
          </div>
        )}
        {formError && (
          <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
        )}
        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="rounded-md border border-(--accent) bg-(--accent) px-3 py-1.5 text-sm font-semibold text-(--bg) disabled:opacity-60"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit'}
        </button>
      </form>

      <label className="block">
        <span className="sr-only">Search feature requests</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or description…"
          autoComplete="off"
          className="w-full rounded-lg border border-(--outline) bg-(--bg) px-3 py-2 text-sm text-(--prose)"
        />
      </label>

      <SegmentedToggle
        options={[
          { id: 'top', label: 'Top' },
          { id: 'newest', label: 'Newest' },
        ]}
        value={sort}
        onChange={setSort}
      />

      {listQuery.isPending && (
        <p className="text-sm text-(--prose-2)">Loading…</p>
      )}
      {listQuery.error && (
        <QueryErrorBanner
          message={
            listQuery.error instanceof Error
              ? listQuery.error.message
              : 'Failed'
          }
          onRetry={() => void listQuery.refetch()}
        />
      )}

      {!listQuery.isPending && !listQuery.error && (
        <div className="space-y-5">
          <section className="space-y-2">
            <SectionHeader
              title="Active requests"
              meta={`(${buckets.active.length})`}
              open
              onToggle={() => {}}
              collapsible={false}
            />
            <RequestList
              items={buckets.active}
              emptyCopy={
                search.trim()
                  ? 'No active requests match this search.'
                  : 'No active requests — submit one above.'
              }
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
