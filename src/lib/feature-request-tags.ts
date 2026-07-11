/**
 * Feature-request category tags (single-select).
 * Distinct from status pills and rarity colors.
 */

export const FEATURE_REQUEST_TAGS = [
  'bug_fix',
  'new_feature',
  'change',
  'badge_update',
] as const;

export type FeatureRequestTag = (typeof FEATURE_REQUEST_TAGS)[number];

export const FEATURE_TAG_LABELS: Record<FeatureRequestTag, string> = {
  bug_fix: 'Bug Fix',
  new_feature: 'New Feature',
  change: 'Change/Improvement',
  badge_update: 'Badge Update',
};

export function isFeatureRequestTag(
  v: string | null | undefined,
): v is FeatureRequestTag {
  return (
    typeof v === 'string' &&
    (FEATURE_REQUEST_TAGS as readonly string[]).includes(v)
  );
}

/** CSS custom property for tag pills (not status / rarity). */
export function featureTagAccentVar(
  tag: FeatureRequestTag | null | undefined,
): string {
  switch (tag) {
    case 'bug_fix':
      return '--feature-tag-bug';
    case 'new_feature':
      return '--feature-tag-feature';
    case 'change':
      return '--feature-tag-change';
    case 'badge_update':
      return '--feature-tag-badge';
    case null:
    case undefined:
      return '--feature-tag-uncat';
    default: {
      const _exhaustive: never = tag;
      return _exhaustive;
    }
  }
}

export function featureTagLabel(
  tag: string | null | undefined,
): string {
  if (isFeatureRequestTag(tag)) return FEATURE_TAG_LABELS[tag];
  return 'Uncategorized';
}
