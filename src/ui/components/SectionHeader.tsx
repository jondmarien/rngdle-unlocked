/** Expand/collapse section header — shared by Profile and Features. */
export function SectionHeader({
  title,
  meta,
  open,
  onToggle,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-baseline justify-between gap-2 text-left"
      aria-expanded={open}
    >
      <h2 className="text-base font-bold text-[var(--prose)]">
        <span className="mr-1.5 inline-block w-4 text-center text-sm text-[var(--prose-3)]">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 text-sm text-[var(--prose-2)]">{meta}</span>
      )}
    </button>
  );
}
