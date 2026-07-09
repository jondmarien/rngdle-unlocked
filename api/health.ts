import { defineHandler } from '../server/vercel-adapter.js';

/** Smoke-test endpoint — no DB. */
export default defineHandler(async () => {
  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasAuthSecret: Boolean(process.env.BETTER_AUTH_SECRET),
    baseUrl:
      process.env.BETTER_AUTH_URL ||
      process.env.VITE_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null),
  });
});
