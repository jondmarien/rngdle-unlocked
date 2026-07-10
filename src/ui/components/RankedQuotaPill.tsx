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

  const { data: quota } = useQuery({
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

  // No data yet / first peek soft-failed — hide rather than invent an error.
  if (!signedIn || quota == null) return null;

  const low = quota.remaining <= 10;
  const resetLabel =
    quota.resetsInSec != null ? formatRankedResetsIn(quota.resetsInSec) : null;

  return (
    <span
      className={`rounded-md border px-2.5 py-1 ${
        low
          ? 'border-amber-500/70 text-amber-600'
          : 'border-[var(--outline)] text-[var(--prose-2)]'
      }`}
      title={
        resetLabel
          ? `${quota.remaining}/${quota.limit} Ranked rolls left · ${resetLabel}`
          : `${quota.remaining}/${quota.limit} Ranked rolls left this hour`
      }
    >
      {quota.remaining}/{quota.limit} left
      {resetLabel ? (
        <span className="ml-1.5 opacity-80">· {resetLabel}</span>
      ) : null}
    </span>
  );
}
