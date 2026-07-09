import type { ReactNode } from 'react';

export type SegmentedOption<T extends string> = {
  id: T;
  label: ReactNode;
  /** Amber active state for Ranked lanes (competitive accent). */
  accent?: 'amber';
};

const ACTIVE_DEFAULT =
  'border-[var(--prose)] bg-[var(--prose)] text-[var(--bg)]';
const ACTIVE_AMBER = 'border-amber-500 bg-amber-500 text-black';

/**
 * Shared segmented button group — replaces the hand-repeated
 * active/inactive toggle class clusters across screens.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className = 'flex flex-wrap gap-2',
  chipClassName = 'rounded-md border px-2.5 py-1.5 text-sm font-semibold',
  inactiveClassName = 'border-[var(--outline)] text-[var(--prose-2)]',
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Container layout classes. */
  className?: string;
  /** Shape/size classes shared by every chip. */
  chipClassName?: string;
  /** Inactive state classes (border/text/hover). */
  inactiveClassName?: string;
}) {
  return (
    <div className={className}>
      {options.map((o) => {
        const selected = o.id === value;
        const state = selected
          ? o.accent === 'amber'
            ? ACTIVE_AMBER
            : ACTIVE_DEFAULT
          : inactiveClassName;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`${chipClassName} ${state}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
