import { type KeyboardEvent, type ReactNode, useId, useRef } from 'react';

export type SegmentedOption<T extends string> = {
  id: T;
  label: ReactNode;
  /** Amber active state for Ranked lanes (competitive accent). */
  accent?: 'amber';
};

const ACTIVE_DEFAULT = 'border-(--accent) bg-(--accent) text-(--bg)';
const ACTIVE_AMBER = 'border-amber-500 bg-amber-500 text-black';

/**
 * Shared segmented button group — replaces the hand-repeated
 * active/inactive toggle class clusters across screens.
 * Keyboard: Left/Right/Home/End move selection within the group.
 */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  className = 'flex flex-wrap gap-2',
  chipClassName = 'rounded-md border px-2.5 py-1.5 text-sm font-semibold',
  inactiveClassName = 'border-(--outline) text-(--prose-2)',
  'aria-label': ariaLabel,
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
  'aria-label'?: string;
}) {
  const groupId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = (index: number) => {
    const el = refs.current[index];
    el?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const ids = options.map((o) => o.id);
    const i = ids.indexOf(value);
    if (i < 0) return;

    let next = i;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (i + 1) % ids.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (i - 1 + ids.length) % ids.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = ids.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(ids[next]!);
    focusIndex(next);
  };

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={className}
      onKeyDown={onKeyDown}
    >
      {options.map((o, index) => {
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
            ref={(el) => {
              refs.current[index] = el;
            }}
            id={`${groupId}-${o.id}`}
            aria-pressed={selected}
            tabIndex={selected ? 0 : -1}
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
