/** Expand/collapse section header — shared by Profile and Features. */
export function SectionHeader({
  title,
  meta,
  open,
  onToggle,
  collapsible = true,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  /** When false, renders a static heading (no expand control). */
  collapsible?: boolean;
}) {
  if (!collapsible) {
    return (
      <div className="flex w-full items-baseline justify-between gap-2 text-left">
        <h2 className="text-base font-bold text-(--prose)">{title}</h2>
        {meta && (
          <span className="shrink-0 text-sm text-(--prose-2)">{meta}</span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex min-h-11 w-full items-center justify-between gap-2 py-1 text-left"
      aria-expanded={open}
    >
      <h2 className="text-base font-bold text-(--prose)">
        <span className="mr-1.5 inline-block w-4 text-center text-sm text-(--accent)">
          {open ? '▾' : '▸'}
        </span>
        {title}
      </h2>
      {meta && (
        <span className="shrink-0 text-sm text-(--prose-2)">{meta}</span>
      )}
    </button>
  );
}
