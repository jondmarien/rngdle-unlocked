export type HighlightBadgeSnippet = {
  name: string;
  emoji?: string;
  family?: string | null;
  rarity?: string | null;
  ep?: number;
};

export type HighlightRoll = {
  id: string;
  shortCode: string | null;
  number: number;
  totalEP: number;
  rarity: string;
  username: string | null;
  badgeCount: number;
  topBadges: HighlightBadgeSnippet[];
  rolledAt: string;
};

export type HighlightsPayload = {
  today: HighlightRoll | null;
  week: HighlightRoll | null;
  allTime: HighlightRoll | null;
  todayRollCount: number;
  weekRollCount: number;
  allTimeRollCount: number;
};

/** Community Ranked bests for the home screen (tz-aware "today"). */
export async function fetchHighlights(
  signal?: AbortSignal,
): Promise<HighlightsPayload> {
  const tzOffset = new Date().getTimezoneOffset();
  const res = await fetch(
    `/api/highlights?tzOffset=${encodeURIComponent(String(tzOffset))}`,
    { signal, credentials: 'same-origin' },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HighlightsPayload;
}
