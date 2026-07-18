import { useId, useRef, type ReactNode } from 'react';
import type { RankedTier } from '../../lib/ranked-limits';
import { tierLabel } from '../../lib/profile-frames';

/**
 * Native Popover API tip (same pattern as Home “Prove roll”).
 * Wrap a trigger; show unlock copy for locked Ranked Plus cosmetics.
 */
export function UnlockTipPopover({
  minTier,
  kind,
  children,
  className = '',
}: {
  minTier: RankedTier;
  kind: 'avatar' | 'frame';
  children: ReactNode;
  className?: string;
}) {
  const tipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const label = tierLabel(minTier);
  const title =
    kind === 'avatar'
      ? `Ranked Plus · ${label} emblem`
      : `Ranked Plus · ${label} frame`;
  const how =
    minTier === 'free'
      ? 'Always available.'
      : `Subscribe to ${label} or higher to unlock. Higher tiers include lower-tier cosmetics.`;

  const show = () => {
    const tip = tipRef.current;
    const btn = triggerRef.current;
    if (!tip?.showPopover || !btn) return;
    const r = btn.getBoundingClientRect();
    tip.style.position = 'fixed';
    tip.style.left = `${Math.round(r.left + r.width / 2)}px`;
    tip.style.top = `${Math.round(r.top - 8)}px`;
    tip.style.transform = 'translate(-50%, -100%)';
    tip.style.margin = '0';
    tip.showPopover();
  };

  const hide = () => {
    tipRef.current?.hidePopover?.();
  };

  return (
    <span className={`relative inline-flex w-full ${className}`}>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        className="inline-flex w-full cursor-help"
        aria-describedby={tipId}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => {
          if (e.key === 'Escape') hide();
        }}
      >
        {children}
      </span>
      <div
        ref={tipRef}
        id={tipId}
        popover="auto"
        className="m-0 max-w-xs rounded-lg border border-(--outline) bg-(--surface-raised) p-3 text-left text-sm text-(--prose) shadow-lg"
      >
        <p className="font-semibold text-(--prose)">{title}</p>
        <p className="mt-1 text-(--prose-2)">{how}</p>
        <p className="mt-1.5 text-xs text-(--prose-3)">
          Details on{' '}
          <a className="underline" href="/payments">
            Payments
          </a>
          .
        </p>
      </div>
    </span>
  );
}
