import { put } from '@vercel/blob';
import { rateGuard, requireUser } from '../../server/apiGuards.js';
import { createDb } from '../../server/db/index.js';
import { createLogger } from '../../server/logger.js';
import { LIMITS } from '../../server/rateLimit.js';
import { defineHandler } from '../../server/vercel-adapter.js';

const log = createLogger('api/feature-requests/upload');

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * POST multipart — upload a feature-request image to Vercel Blob (public).
 * Returns { url }. Requires BLOB_READ_WRITE_TOKEN.
 */
export default defineHandler(async (request) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireUser(request);
  if (!gate.ok) return gate.response;
  const me = gate.user;
  const db = createDb();

  const limited = await rateGuard(
    db,
    `user:${me.id}:feature-upload`,
    LIMITS.featureRequestSubmitPerHour,
    60 * 60 * 1000,
  );
  if (limited) return limited;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      { error: 'Blob storage is not configured' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: 'Expected multipart form data' },
      { status: 400 },
    );
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json(
      { error: 'Only JPEG, PNG, WebP, or GIF images are allowed' },
      { status: 400 },
    );
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return Response.json(
      { error: `Image must be between 1 byte and ${MAX_BYTES} bytes (2MB)` },
      { status: 400 },
    );
  }

  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : file.type === 'image/gif'
          ? 'gif'
          : 'jpg';
  const pathname = `feature-requests/${me.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    });
    log.info('uploaded', {
      userId: me.id,
      size: file.size,
      pathname: blob.pathname,
    });
    return Response.json({ url: blob.url });
  } catch (err) {
    log.error('upload failed', {
      err: err instanceof Error ? err.message : String(err),
    });
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
});
