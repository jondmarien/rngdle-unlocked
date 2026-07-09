// Bundle api/**/*.ts serverless entrypoints to ESM JavaScript.
//
// TypeScript 7 is a native Go compiler and no longer exposes the classic
// typescript JS API (ts.sys.readFile, etc.). Vercel's function builder still
// requires that API when it sees api TypeScript sources, so on Vercel we emit
// .js next to each route and remove the .ts sources after the app build.
import * as esbuild from 'esbuild';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'api');

async function walkTs(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTs(full)));
    } else if (entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const entries = await walkTs(apiDir);
if (entries.length === 0) {
  console.log('[build-api] no api TypeScript entrypoints found');
  process.exit(0);
}

console.log(`[build-api] bundling ${entries.length} API route(s)`);

await esbuild.build({
  entryPoints: entries,
  outdir: apiDir,
  outbase: apiDir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  // Leave package deps in node_modules for the Vercel Node runtime.
  packages: 'external',
  logLevel: 'info',
});

// Only strip TypeScript sources on Vercel so the platform never invokes
// require('typescript') against the native TS 7 package.
if (process.env.VERCEL) {
  for (const file of entries) {
    await unlink(file);
    console.log(
      `[build-api] removed ${path.relative(root, file)} (deploying .js)`,
    );
  }
} else {
  console.log(
    '[build-api] left api TypeScript sources in place (set VERCEL=1 to strip)',
  );
}
