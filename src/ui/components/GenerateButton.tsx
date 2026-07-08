import { useRef } from 'react';

export function GenerateButton({
  hasRolled,
  busy,
  onClick,
}: {
  hasRolled: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  const last = useRef(0);

  const handle = () => {
    const now = performance.now();
    if (now - last.current < 300) return;
    last.current = now;
    onClick();
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={handle}
      className="min-w-[12rem] border-2 border-[var(--prose)] bg-[var(--prose)] px-8 py-3 font-bold uppercase tracking-[0.2em] text-[var(--bg)] transition hover:bg-transparent hover:text-[var(--prose)] disabled:cursor-wait disabled:opacity-60"
    >
      {busy ? 'Rolling…' : hasRolled ? 'Roll again' : 'Generate'}
    </button>
  );
}
