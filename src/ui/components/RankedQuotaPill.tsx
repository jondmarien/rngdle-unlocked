import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../../lib/auth-client';
import { createTopupCheckout } from '../../lib/checkout-api';
import {
  RANKED_TOPUP_CATALOG,
  TOPUP_NON_ROLLOVER,
} from '../../lib/ranked-topup-catalog';
import type { TopupSku } from '../../lib/ranked-topups';
import {
  fetchRankedQuota,
  formatRankedResetsIn,
  RANKED_QUOTA_QUERY_KEY,
  type RankedQuota,
} from '../../lib/roll-api';

/**
 * Ranked gameplay quota pill — visibility + this-hour top-up picker at 0 left.
 * Soft-fails when GET quota is unavailable (incl. soft burst 429).
 */
export function RankedQuotaPill() {
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutErr, setCheckoutErr] = useState<string | null>(null);
  const tipId = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    const tip = tipRef.current;
    const btn = triggerRef.current;
    if (!tip?.showPopover || !btn) return;
    const r = btn.getBoundingClientRect();
    tip.style.position = 'fixed';
    tip.style.left = `${Math.round(Math.min(r.left + r.width / 2, window.innerWidth - 160))}px`;
    tip.style.top = `${Math.round(r.bottom + 8)}px`;
    tip.style.transform = 'translateX(-50%)';
    tip.style.margin = '0';
    tip.showPopover();
    return () => {
      tip.hidePopover?.();
    };
  }, [pickerOpen]);

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

  const atZero = remaining === 0;
  const upgradeHref = atZero
    ? quota.limit < 120
      ? '/plus?upgrade=rare'
      : quota.limit < 150
        ? '/plus?upgrade=epic'
        : quota.limit < 180
          ? '/plus?upgrade=anomaly'
          : null
    : null;
  const regenHint =
    !atZero &&
    remaining < quota.limit &&
    quota.nextRegenInSec != null &&
    (quota.regenPerTick ?? 0) > 0
      ? `+${quota.regenPerTick} in ${quota.nextRegenInSec}s`
      : null;

  const packBonus = quota.packBonus ?? 0;
  const hasOverload = Boolean(quota.hasOverload);

  const startTopup = async (sku: TopupSku) => {
    setCheckoutBusy(true);
    setCheckoutErr(null);
    try {
      const { url } = await createTopupCheckout({ sku });
      window.location.href = url;
    } catch (err) {
      setCheckoutErr(
        err instanceof Error ? err.message : 'Could not start checkout',
      );
      setCheckoutBusy(false);
    }
  };

  return (
    <span
      className={`relative inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1 ${tone}`}
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
        {regenHint ? (
          <span className="ml-1.5 opacity-80">· {regenHint}</span>
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
      {atZero ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            className="shrink-0 font-semibold text-(--accent) underline-offset-2 hover:underline"
            aria-expanded={pickerOpen}
            aria-controls={tipId}
            onClick={() => {
              setCheckoutErr(null);
              setPickerOpen((o) => !o);
            }}
          >
            Top up
          </button>
          {pickerOpen ? (
            <div
              ref={tipRef}
              id={tipId}
              popover="manual"
              className="m-0 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-(--outline) bg-(--surface-raised) p-3 text-left text-sm text-(--prose) shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-(--prose)">This hour</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-(--prose-3) underline"
                  onClick={() => setPickerOpen(false)}
                >
                  Close
                </button>
              </div>
              <p className="mt-1 text-xs text-(--prose-3)">
                {TOPUP_NON_ROLLOVER}
              </p>
              <ul className="mt-2 space-y-2">
                {RANKED_TOPUP_CATALOG.map((card) => {
                  const packBlocked =
                    !card.isOverload && packBonus + card.bonusRolls > 90;
                  const overloadBlocked = card.isOverload && hasOverload;
                  const disabled =
                    checkoutBusy || packBlocked || overloadBlocked;
                  return (
                    <li
                      key={card.sku}
                      className="flex items-center justify-between gap-2 rounded-md border border-(--outline) bg-(--bg) px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-(--prose)">
                          {card.label}
                        </p>
                        <p className="font-mono text-[11px] tabular-nums text-(--prose-3)">
                          {card.priceCad}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={disabled}
                        className="shrink-0 border border-(--accent) bg-(--accent) px-2 py-1 text-[11px] font-bold uppercase text-(--bg) disabled:opacity-50"
                        onClick={() => void startTopup(card.sku)}
                      >
                        {overloadBlocked
                          ? 'Owned'
                          : packBlocked
                            ? 'Cap'
                            : checkoutBusy
                              ? '…'
                              : 'Buy'}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {checkoutErr ? (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {checkoutErr}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-(--prose-3)">
                <a
                  className="font-semibold text-(--accent) underline"
                  href="/plus?topup=1"
                >
                  Open on Plus
                </a>
                {' · '}
                <a className="underline" href="/payments">
                  Payments
                </a>
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </span>
  );
}
