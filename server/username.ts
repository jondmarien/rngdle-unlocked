/** Public @username rules — keep in sync with Account /admin claim UI. */
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, '');
}

export function isValidUsername(raw: string): boolean {
  return USERNAME_RE.test(normalizeUsername(raw));
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
  if (USERNAME_RE.test(fromName)) return fromName;

  const local = (input.email ?? '').split('@')[0] ?? '';
  const fromEmail = local
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  if (USERNAME_RE.test(fromEmail)) return fromEmail;

  return null;
}
