/**
 * Helpers for API handlers (Web Request/Response after vercel-adapter).
 */

export type ApiHeaders = {
  get(name: string): string | null;
};

export type ApiRequest = {
  method: string;
  url: string;
  headers: ApiHeaders;
  json(): Promise<unknown>;
};

/** Safe absolute URL parse for handlers (never throws). */
export function requestUrl(
  request: Request | ApiRequest,
  fallbackPath = '/',
): URL {
  try {
    return new URL(request.url);
  } catch {
    const host =
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      'localhost';
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      'https';
    const path =
      typeof request.url === 'string' && request.url.startsWith('/')
        ? request.url
        : fallbackPath;
    return new URL(path, `${proto}://${host}`);
  }
}
