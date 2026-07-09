/**
 * Explicit Web Fetch request shape for Vercel serverless handlers.
 * Avoids ambient `Request` clashes (Node vs DOM) under Vercel's isolated typecheck.
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

/** better-auth expects the full Fetch Request; runtime value is the real one. */
export function asFetchRequest(request: ApiRequest): globalThis.Request {
  return request as unknown as globalThis.Request;
}

/** better-auth headers option accepts HeadersInit; keep the cast localized. */
export function asAuthHeaders(headers: ApiHeaders): {
  get(name: string): string | null;
} {
  return headers;
}
