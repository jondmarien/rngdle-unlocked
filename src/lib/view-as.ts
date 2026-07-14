/** Read-only admin “View site as” — sessionStorage only; never swaps auth. */

const KEY = 'rngdle:viewAsUsername';
export const VIEW_AS_EVENT = 'rngdle:view-as';

export function getViewAsUsername(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  const v = sessionStorage.getItem(KEY);
  return v && v.trim() ? v.trim().toLowerCase() : null;
}

function notify(): void {
  window.dispatchEvent(new Event(VIEW_AS_EVENT));
}

export function startViewAs(username: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(KEY, username.trim().toLowerCase().replace(/^@+/, ''));
  notify();
}

export function clearViewAs(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(KEY);
  notify();
}
