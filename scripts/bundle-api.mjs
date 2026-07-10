/**
 * Bundle each api TypeScript entry into a single ESM .js next to the source.
 *
 * On Vercel (`VERCEL=1`), replace each `.ts` with a thin re-export of the
 * colocated `.js`. Vercel discovers function paths like
 * `api/admin/users/ban.ts` up front — deleting those files caused
 * “File not found: …/ban.ts”. Thin stubs keep the path while skipping the
 * Node builder’s per-function typecheck of the full server/game graph.
 *
 * Locally, `.ts` sources are left untouched (this script only emits `.js`).
 * Authoring stays TypeScript; `pnpm typecheck` is the type gate.
 *
 * Usage: node scripts/bundle-api.mjs
 */
import { build } from 'esbuild';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiRoot = join(root, 'api');

async function collectTsEntries(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectTsEntries(full)));
    } else if (ent.isFile() && ent.name.endsWith('.ts')) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const entries = await collectTsEntries(apiRoot);
  if (entries.length === 0) {
    console.warn('[bundle-api] no api TypeScript entries found');
    return;
  }

  console.log(`[bundle-api] bundling ${entries.length} handlers…`);
  const started = Date.now();

  await build({
    entryPoints: entries,
    outdir: apiRoot,
    outbase: apiRoot,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    // Keep package imports external; only inline our api/server/src/game graph.
    packages: 'external',
    sourcemap: false,
    logLevel: 'warning',
  });

  const rewriteTs =
    process.env.VERCEL === '1' || process.env.BUNDLE_API_REWRITE === '1';
  if (rewriteTs) {
    for (const tsPath of entries) {
      const name = tsPath
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        .replace(/\.ts$/, '');
      await writeFile(
        tsPath,
        `export { default } from './${name}.js';\n`,
        'utf8',
      );
    }
  }

  await writeFile(
    join(apiRoot, '.bundled'),
    `bundled ${entries.length} entries at ${new Date().toISOString()}\n`,
    'utf8',
  );

  const rel = entries.map((p) => relative(root, p).replace(/\\/g, '/'));
  console.log(
    `[bundle-api] wrote ${entries.length} .js${rewriteTs ? ' + thin .ts re-exports' : ' (kept .ts sources)'} in ${Date.now() - started}ms`,
  );
  for (const r of rel.slice(0, 5)) {
    console.log(`  - ${r} → ${r.replace(/\.ts$/, '.js')}`);
  }
  if (rel.length > 5) console.log(`  … +${rel.length - 5} more`);
}

main().catch((err) => {
  console.error('[bundle-api] failed', err);
  process.exit(1);
});
