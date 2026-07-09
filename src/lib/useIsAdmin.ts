import { useQuery } from '@tanstack/react-query';
import { checkIsAdmin } from './admin-api';

/**
 * Shared admin probe — one cached query per signed-in user instead of the
 * previous per-component `fetch('/api/admin/broadcast')` triplication.
 */
export function useIsAdmin(userId: string | null | undefined): {
  isAdmin: boolean;
  checking: boolean;
} {
  const query = useQuery({
    queryKey: ['is-admin', userId ?? 'anon'],
    queryFn: checkIsAdmin,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  if (!userId) return { isAdmin: false, checking: false };
  return { isAdmin: query.data ?? false, checking: query.isPending };
}
