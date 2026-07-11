import { formatDateTime, formatRelative } from '../../lib/format';
import type { InboxItem } from '../../lib/notifications-api';
import {
  displayBody,
  inboxOpenLabel,
  parseSystemBody,
  periodLabel,
  visualAccentVar,
  visualGlyph,
  type CrownPeriod,
  type InboxPresentation,
  type NotifVisualType,
} from '../../lib/inboxPresentation';

function accentCss(type: NotifVisualType): string {
  return `var(${visualAccentVar(type)})`;
}

function PeriodTags({ periods }: { periods: CrownPeriod[] }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {periods.map((p) => (
        <span
          key={p}
          className="rounded border border-(--outline) px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-(--prose-3)"
        >
          {periodLabel(p)}
        </span>
      ))}
    </span>
  );
}

function RowBody({
  visualType,
  title,
  body,
  href,
  read,
  createdAt,
  periods,
  onActivate,
}: {
  visualType: NotifVisualType;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
  periods?: CrownPeriod[];
  onActivate: () => void;
}) {
  const accent = accentCss(visualType);
  const isSystem =
    visualType === 'system_crown' || visualType === 'system_broadcast';
  const parsed = isSystem ? parseSystemBody(body) : null;
  const activityBody = !isSystem ? displayBody(body) : '';
  const relative = formatRelative(createdAt) ?? formatDateTime(createdAt);

  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={`${read ? '' : 'Unread. '}${title}${body ? `. ${body.slice(0, 120)}` : ''}`}
      className={`group relative w-full overflow-hidden px-3 py-3 text-left transition-[background-color,opacity] duration-150 hover:bg-(--surface-raised) active:scale-[0.995] ${
        read ? 'opacity-70' : ''
      }`}
      style={
        !read
          ? {
              backgroundColor: `color-mix(in srgb, ${accent} 8%, var(--surface))`,
            }
          : undefined
      }
    >
      {!read && (
        <span
          className="absolute inset-y-0 left-0 w-[3px]"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2.5 pl-0.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-base"
          style={{
            backgroundColor: `color-mix(in srgb, ${accent} 18%, var(--surface))`,
            color: accent,
          }}
          aria-hidden
        >
          {visualGlyph(visualType)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-sm leading-snug text-(--prose) ${
                read ? 'font-medium text-(--prose-2)' : 'font-semibold'
              }`}
            >
              {!read && (
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: accent }}
                  aria-label="Unread"
                />
              )}
              {title}
            </p>
            <time
              className="shrink-0 text-xs text-(--prose-3)"
              dateTime={createdAt}
              title={formatDateTime(createdAt)}
            >
              {relative}
            </time>
          </div>
          {periods && periods.length > 0 && <PeriodTags periods={periods} />}
          {parsed ? (
            <>
              {parsed.lead && (
                <p className="mt-1 text-sm leading-snug text-(--prose-2)">
                  {parsed.lead}
                </p>
              )}
              {parsed.detail && (
                <p className="mt-0.5 text-xs leading-snug text-(--prose-3) line-clamp-3">
                  {parsed.detail}
                </p>
              )}
            </>
          ) : (
            activityBody && (
              <p className="mt-1 text-sm leading-snug text-(--prose-2) line-clamp-2">
                {activityBody}
              </p>
            )
          )}
          {href && (
            <p className="mt-1 text-xs font-medium text-(--prose-3) underline-offset-2 group-hover:underline">
              {inboxOpenLabel(href)}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export function NotificationRow({
  presentation,
  onActivate,
}: {
  presentation: InboxPresentation;
  onActivate: (
    ids: string[],
    href: string | null,
    tab: InboxItem['tab'],
  ) => void;
}) {
  if (presentation.kind === 'single') {
    const { item, visualType } = presentation;
    return (
      <li>
        <RowBody
          visualType={visualType}
          title={item.title}
          body={item.body}
          href={item.href}
          read={item.read}
          createdAt={item.createdAt}
          onActivate={() => onActivate([item.id], item.href, item.tab)}
        />
      </li>
    );
  }

  return (
    <li>
      <RowBody
        visualType={presentation.visualType}
        title={presentation.title}
        body={presentation.body}
        href={presentation.href}
        read={presentation.read}
        createdAt={presentation.createdAt}
        periods={presentation.periods}
        onActivate={() =>
          onActivate(
            presentation.items.map((i) => i.id),
            presentation.href,
            presentation.tab,
          )
        }
      />
    </li>
  );
}

export function NotificationSkeleton() {
  return (
    <ul
      className="divide-y divide-(--outline) overflow-hidden rounded-lg border border-(--outline)"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start gap-2.5 px-3 py-3">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-(--surface-raised)" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-[60%] animate-pulse rounded bg-(--surface-raised)" />
            <div className="h-3 w-full animate-pulse rounded bg-(--surface-raised)" />
            <div className="h-3 w-[40%] animate-pulse rounded bg-(--surface-raised)" />
          </div>
        </li>
      ))}
    </ul>
  );
}
