/**
 * Publish docs/wiki staging → GitHub Wiki git repo.
 *
 * Usage:
 *   node scripts/publish-wiki.mjs
 *   node scripts/publish-wiki.mjs --dry-run
 *
 * Requires: wiki enabled + at least one page created on GitHub so
 *   https://github.com/jondmarien/rngdle-unlocked.wiki.git clones.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const staging = join(root, 'docs', 'wiki');
const dryRun = process.argv.includes('--dry-run');
const wikiRemote =
  process.env.WIKI_REMOTE ||
  'https://github.com/jondmarien/rngdle-unlocked.wiki.git';

if (!existsSync(staging)) {
  console.error('Missing docs/wiki staging directory');
  process.exit(1);
}

const files = readdirSync(staging).filter(
  (f) => f.endsWith('.md') && f !== 'README.md',
);
if (files.length === 0) {
  console.error('No markdown pages in docs/wiki');
  process.exit(1);
}

console.log(`Publishing ${files.length} pages from docs/wiki → ${wikiRemote}`);
if (dryRun) {
  for (const f of files) console.log(' ', f);
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), 'rngdle-wiki-'));
try {
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', wikiRemote, dir],
    { encoding: 'utf8' },
  );
  if (clone.status !== 0) {
    console.error(clone.stderr || clone.stdout);
    console.error(`
Bootstrap required (one-time):
  1. Enable Wikis on the repo (Settings → Features → Wikis).
  2. Open https://github.com/jondmarien/rngdle-unlocked/wiki while signed in.
  3. Create the initial Home page (any short body; this script overwrites it).
  4. Re-run: pnpm wiki:publish

GitHub does not create rngdle-unlocked.wiki.git until step 3 succeeds.
`);
    process.exit(1);
  }

  for (const f of files) {
    cpSync(join(staging, f), join(dir, f));
  }

  writeFileSync(
    join(dir, '.publish-stamp'),
    `published ${new Date().toISOString()}\n`,
  );

  const run = (args) => {
    const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(r.stderr || r.stdout);
      process.exit(r.status ?? 1);
    }
    return r;
  };

  run(['add', '-A']);
  const status = run(['status', '--porcelain']);
  if (!status.stdout.trim()) {
    console.log('Wiki already up to date.');
    process.exit(0);
  }
  run(['commit', '-m', 'docs: publish wiki from docs/wiki staging']);
  run(['push', 'origin', 'HEAD']);
  console.log('Wiki published.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
