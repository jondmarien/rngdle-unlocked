import { config } from 'dotenv';
config({ path: '.env.local' });

// Import TS via tsx register is not available here; use dynamic import of built-less via tsx path.
// This script is meant to be run as: pnpm exec tsx scripts/test-signup.mjs
// so we import .ts sources.
const { createAuth } = await import('../server/auth.ts');

const auth = createAuth();
const email = `test-${Date.now()}@example.com`;
const url = `${process.env.BETTER_AUTH_URL || 'http://localhost:5173'}/api/auth/sign-up/email`;
console.log('POST', url);

const req = new Request(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: process.env.BETTER_AUTH_URL || 'http://localhost:5173',
  },
  body: JSON.stringify({
    email,
    password: 'TestPass123!',
    name: 'Test User',
  }),
});

try {
  const res = await auth.handler(req);
  console.log('status', res.status);
  console.log('headers', Object.fromEntries(res.headers.entries()));
  console.log('body', await res.text());
} catch (e) {
  console.error('threw', e);
  process.exit(1);
}
