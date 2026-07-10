/** Public @username rules — keep in sync with Account /admin claim UI. */
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

/** Reserved / hate handles — keep short; matched after normalizeUsername. */
const BLOCKED_USERNAMES = new Set([
  'admin',
  'root',
  'nigger',
  'faggot',
  'hitler',
  'nazi',
  '1488',
  'whitepower',
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}

export function isBlockedUsername(raw: string): boolean {
  return BLOCKED_USERNAMES.has(normalizeUsername(raw));
}

/**
 * Format + blocklist check for claiming / changing a public @username.
 * Grandfathers an already-held blocked handle (e.g. legacy `@admin`) so the
 * owner can keep it / re-save it; new claims of blocked names are rejected.
 */
export function isValidUsername(
  raw: string,
  opts?: { currentUsername?: string | null },
): boolean {
  const username = normalizeUsername(raw);
  if (!USERNAME_RE.test(username)) return false;
  if (isBlockedUsername(username)) {
    const current = opts?.currentUsername
      ? normalizeUsername(opts.currentUsername)
      : '';
    return current === username;
  }
  return true;
}

/**
 * Derive a candidate handle from display name or email local-part.
 * Returns null when nothing usable remains after sanitizing.
 */
export function suggestUsernameFromIdentity(input: {
  name?: string | null;
  email?: string | null;
}): string | null {
  const fromName = (input.name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  if (USERNAME_RE.test(fromName) && !isBlockedUsername(fromName)) {
    return fromName;
  }

  const local = (input.email ?? '').split('@')[0] ?? '';
  const fromEmail = local
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  if (USERNAME_RE.test(fromEmail) && !isBlockedUsername(fromEmail)) {
    return fromEmail;
  }

  return null;
}
