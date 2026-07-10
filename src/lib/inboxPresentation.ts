import type { InboxItem } from './notifications-api';

export type NotifVisualType =
  | 'follow'
  | 'badge_unlock'
  | 'secret_mastery'
  | 'overtaken'
  | 'system_crown'
  | 'system_broadcast';

export type CrownPeriod = 'today' | 'week' | 'alltime';

export type InboxPresentation =
  | {
      kind: 'single';
      key: string;
      item: InboxItem;
      visualType: NotifVisualType;
    }
  | {
      kind: 'crown-group';
      key: string;
      items: InboxItem[];
      periods: CrownPeriod[];
      visualType: 'overtaken' | 'system_crown';
      title: string;
      body: string;
      href: string | null;
      actorUsername: string | null;
      read: boolean;
      createdAt: string;
      tab: 'activity' | 'system';
    };

const PERIOD_ORDER: CrownPeriod[] = ['today', 'week', 'alltime'];

const PERIOD_LABEL: Record<CrownPeriod, string> = {
  today: 'Today',
  week: 'Weekly',
  alltime: 'All-time',
};

const OVERTAKE_RE = /^overtake-(today|week|alltime)-(.+)$/;
const BEST_RE = /^best-(today|week|alltime)-(.+)$/;

/** CSS custom property name for the type accent (without var()). */
export function visualAccentVar(type: NotifVisualType): string {
  switch (type) {
    case 'follow':
      return '--accent';
    case 'badge_unlock':
      return '--epic';
    case 'secret_mastery':
      return '--mythic';
    case 'overtaken':
    case 'system_crown':
      return '--anomaly';
    case 'system_broadcast':
      return '--prose-3';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function visualGlyph(type: NotifVisualType): string {
  switch (type) {
    case 'follow':
      return '◎';
    case 'badge_unlock':
      return '◆';
    case 'secret_mastery':
      return '✦';
    case 'overtaken':
      return '📉';
    case 'system_crown':
      return '👑';
    case 'system_broadcast':
      return '✦';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function resolveVisualType(item: InboxItem): NotifVisualType {
  if (item.tab === 'system') {
    return BEST_RE.test(item.id) ? 'system_crown' : 'system_broadcast';
  }
  switch (item.kind) {
    case 'follow':
      return 'follow';
    case 'badge_unlock':
      return 'badge_unlock';
    case 'secret_mastery':
      return 'secret_mastery';
    case 'overtaken':
      return 'overtaken';
    default:
      return 'follow';
  }
}

export function periodLabel(period: CrownPeriod): string {
  return PERIOD_LABEL[period];
}

function parseCrownId(
  id: string,
  prefix: 'overtake' | 'best',
): { period: CrownPeriod; rollId: string } | null {
  const re = prefix === 'overtake' ? OVERTAKE_RE : BEST_RE;
  const m = id.match(re);
  if (!m?.[1] || !m[2]) return null;
  const period = m[1] as CrownPeriod;
  if (period !== 'today' && period !== 'week' && period !== 'alltime') {
    return null;
  }
  return { period, rollId: m[2] };
}

function periodRank(period: CrownPeriod): number {
  return PERIOD_ORDER.indexOf(period);
}

/** Prefer all-time body, then week, then today (richest board context). */
function pickRichest(items: InboxItem[]): InboxItem {
  let best = items[0]!;
  let bestRank = -1;
  for (const item of items) {
    const parsed =
      parseCrownId(item.id, 'overtake') ?? parseCrownId(item.id, 'best');
    const rank = parsed ? periodRank(parsed.period) : -1;
    if (rank > bestRank) {
      best = item;
      bestRank = rank;
    }
  }
  return best;
}

function newestCreatedAt(items: InboxItem[]): string {
  return items.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b)).createdAt;
}

/**
 * Group same-roll today/week/all-time crown rows into one presentation.
 * Order follows the input list (newest-first from the API).
 */
export function groupInboxItems(items: InboxItem[]): InboxPresentation[] {
  const used = new Set<string>();
  const out: InboxPresentation[] = [];

  for (const item of items) {
    if (used.has(item.id)) continue;

    const overtake = parseCrownId(item.id, 'overtake');
    const best = parseCrownId(item.id, 'best');
    const crown = overtake ?? best;
    if (!crown) {
      used.add(item.id);
      out.push({
        kind: 'single',
        key: `${item.tab}-${item.id}`,
        item,
        visualType: resolveVisualType(item),
      });
      continue;
    }

    const prefix = overtake ? 'overtake' : 'best';
    const siblings = items.filter((other) => {
      if (other.tab !== item.tab) return false;
      const p = parseCrownId(other.id, prefix);
      return p?.rollId === crown.rollId;
    });

    for (const s of siblings) used.add(s.id);

    if (siblings.length === 1) {
      out.push({
        kind: 'single',
        key: `${item.tab}-${item.id}`,
        item,
        visualType: resolveVisualType(item),
      });
      continue;
    }

    const periods = PERIOD_ORDER.filter((p) =>
      siblings.some((s) => parseCrownId(s.id, prefix)?.period === p),
    );
    const richest = pickRichest(siblings);
    const handle =
      richest.actorUsername ??
      siblings.find((s) => s.actorUsername)?.actorUsername ??
      null;

    let title: string;
    if (prefix === 'overtake') {
      title = handle ? `Overtaken by @${handle}` : 'Overtaken';
    } else {
      const fromTitle = richest.title.match(/@[\w.-]+/);
      title = fromTitle
        ? `Best roll — ${fromTitle[0]}`
        : handle
          ? `Best roll — @${handle}`
          : 'Best roll';
    }

    out.push({
      kind: 'crown-group',
      key: `${item.tab}-${prefix}-${crown.rollId}`,
      items: siblings,
      periods,
      visualType: prefix === 'overtake' ? 'overtaken' : 'system_crown',
      title,
      body: richest.body,
      href: richest.href,
      actorUsername: handle,
      read: siblings.every((s) => s.read),
      createdAt: newestCreatedAt(siblings),
      tab: item.tab,
    });
  }

  return out;
}

/** Unread presentation count (one crown group = 1). */
export function countUnreadPresentations(
  presentations: InboxPresentation[],
): number {
  return presentations.filter((p) =>
    p.kind === 'single' ? !p.item.read : !p.read,
  ).length;
}

export function countGroupedUnread(payload: {
  activity: InboxItem[];
  system: InboxItem[];
}): { activity: number; system: number; total: number } {
  const activity = countUnreadPresentations(groupInboxItems(payload.activity));
  const system = countUnreadPresentations(groupInboxItems(payload.system));
  return { activity, system, total: activity + system };
}

export type ParsedSystemBody = {
  lead: string;
  detail: string;
  openStripped: boolean;
};

/** Split system crown / broadcast body into primary + secondary lines. */
export function parseSystemBody(body: string): ParsedSystemBody {
  const openStripped = /Open:\s*\/[^\s]+/i.test(body);
  const cleaned = body.replace(/\s*Open:\s*\/[^\s]+/gi, '').trim();
  if (!cleaned) {
    return { lead: '', detail: '', openStripped };
  }

  // First sentence = lead; rest = detail (stats, badges, previous).
  const m = cleaned.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  if (!m) {
    return { lead: cleaned, detail: '', openStripped };
  }
  return { lead: m[1]!.trim(), detail: m[2]!.trim(), openStripped };
}

/** Strip Open: path from activity bodies if present; keep rest. */
export function displayBody(body: string): string {
  return body.replace(/\s*Open:\s*\/[^\s]+/gi, '').trim();
}
