import { useRef } from 'react';

export function GenerateButton({
  hasRolled,
  busy,
  locked,
  lockedLabel,
  onClick,
}: {
  hasRolled: boolean;
  busy: boolean;
  /** Daily/Weekly already claimed for this UTC period. */
  locked?: boolean;
  lockedLabel?: string;
  onClick: () => void;
}) {
  const last = useRef(0);

  const handle = () => {
    if (locked) return;
    const now = performance.now();
    if (now - last.current < 300) return;
    last.current = now;
    onClick();
  };

  const label = locked
    ? (lockedLabel ?? 'Already rolled')
    : busy
      ? 'Rolling…'
      : hasRolled
        ? 'Roll again'
        : 'Generate';

  return (
    <button
      type="button"
      disabled={busy || !!locked}
      onClick={handle}
      className="min-w-[13rem] border-2 border-[var(--prose)] bg-[var(--prose)] px-8 py-3.5 text-base font-bold tracking-wide text-[var(--bg)] transition hover:bg-transparent hover:text-[var(--prose)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {label}
    </button>
  );
}
