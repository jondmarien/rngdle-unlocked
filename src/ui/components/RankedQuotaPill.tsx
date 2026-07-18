import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/auth-client';
import {
  fetchRankedQuota,
  formatRankedResetsIn,
  RANKED_QUOTA_QUERY_KEY,
  type RankedQuota,
} from '../../lib/roll-api';

/**
 * Ranked gameplay quota pill — visibility only.
 * Soft-fails when GET quota is unavailable (incl. soft burst 429).
 */
export function RankedQuotaPill() {
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);

  const {
    data: quota,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: RANKED_QUOTA_QUERY_KEY,
    queryFn: async ({ client }) => {
      const next = await fetchRankedQuota();
      if (next) return next;
      // Soft-fail: keep last known quota; never surface a second rate-limit error.
      const prev = client.getQueryData<RankedQuota>(RANKED_QUOTA_QUERY_KEY);
      if (prev) return prev;
      throw new Error('ranked quota unavailable');
    },
    enabled: signedIn,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!signedIn) return null;

  if (quota == null && isError) {
    return (
      <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border border-amber-500/50 px-2.5 py-1 text-amber-700 dark:text-amber-400">
        <span className="truncate">Quota unavailable</span>
        <button
          type="button"
          className="shrink-0 underline"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          Retry
        </button>
      </span>
    );
  }

  if (quota == null) return null;

  const remaining = quota.remaining;
  const tone =
    remaining < 3
      ? 'border-red-500/70 text-red-600 dark:text-red-400'
      : remaining < 5
        ? 'border-orange-500/70 text-orange-600 dark:text-orange-400'
        : remaining < 10
          ? 'border-yellow-500/70 text-yellow-700 dark:text-yellow-400'
          : 'border-(--outline) text-(--prose-2)';
  const resetLabel =
    quota.resetsInSec != null ? formatRankedResetsIn(quota.resetsInSec) : null;

  const upgradeHref =
    remaining === 0
      ? quota.limit < 120
        ? '/account?upgrade=rare'
        : quota.limit < 150
          ? '/account?upgrade=epic'
          : quota.limit < 180
            ? '/account?upgrade=anomaly'
            : null
      : null;

  return (
    <span
      className={`inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1 ${tone}`}
      title={
        resetLabel
          ? `${remaining}/${quota.limit} Ranked rolls left · ${resetLabel}`
          : `${remaining}/${quota.limit} Ranked rolls left this hour`
      }
    >
      <span className="truncate">
        {remaining}/{quota.limit} left
        {resetLabel ? (
          <span className="ml-1.5 opacity-80">· {resetLabel}</span>
        ) : null}
      </span>
      {upgradeHref ? (
        <a
          href={upgradeHref}
          className="shrink-0 font-semibold text-(--accent) underline-offset-2 hover:underline"
        >
          Upgrade
        </a>
      ) : null}
    </span>
  );
}
