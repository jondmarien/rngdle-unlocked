/**
 * Fix wiki staging encoding issues and ASCII-sanitize for GitHub Wiki Mermaid.
 *
 * - Undoes classic double-UTF-8 mojibake (Â·, â€", etc.)
 * - Replaces arrows / middots / dashes that break Mermaid on GitHub
 * - Optionally refreshes pages copied from docs/*.md
 *
 * Usage: node scripts/sanitize-wiki.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const wikiDir = path.join(root, 'docs', 'wiki');

function undoDoubleUtf8(text) {
  if (!/Â.|â€|Ã.|Â·/.test(text)) return text;
  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8');
    if ((fixed.match(/\uFFFD/g) || []).length > 5) return text;
    return fixed;
  } catch {
    return text;
  }
}

function toWikiSafe(text) {
  // Do not collapse runs of spaces — that destroys Mermaid / code indent.
  return text
    .replace(/\u2192/g, '->')
    .replace(/\u2190/g, '<-')
    .replace(/\u21d2/g, '=>')
    .replace(/\s*\u00b7\s*/g, ' | ')
    .replace(/\s*\u2014\s*/g, ' - ')
    .replace(/\u2013/g, '-')
    .replace(/\u2011/g, '-')
    .replace(/\u2212/g, '-')
    .replace(/\u2264/g, '<=')
    .replace(/\u2265/g, '>=')
    .replace(/\u2260/g, '!=')
    .replace(/\u2026/g, '...')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\u2022/g, '-');
}

function rewriteWikiLinks(body) {
  return body
    .replace(
      /\]\(\.\.\/README\.md[^)]*\)/g,
      '](https://github.com/jondmarien/rngdle-unlocked#docs-moved-to-the-wiki)',
    )
    .replace(/\]\(\.\/polar-monetization\.md\)/g, '](Polar-Monetization)')
    .replace(/\]\(\.\/polar-checkout-foundation\.md\)/g, '](Ranked-Plus-Checkout)')
    .replace(/\]\(\.\/ARCHITECTURE\.md\)/g, '](Architecture)')
    .replace(/\]\(\.\.\/ARCHITECTURE\.md\)/g, '](Architecture)')
    .replace(
      /\]\(\.\.\/CHANGELOG\.md\)/g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/CHANGELOG.md)',
    )
    .replace(/\]\(\.\/discord-bot\.md\)/g, '](Discord-Bot)')
    .replace(/\]\(\.\/oauth-setup\.md\)/g, '](OAuth)')
    .replace(/\]\(\.\/email-auth\.md\)/g, '](Email-Auth)')
    .replace(/\]\(\.\/refactor-notes-2026-07\.md\)/g, '](Refactor-Notes)')
    .replace(
      /\]\(\.\/opus-report\.md\)/g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/opus-report.md)',
    )
    .replace(
      /\]\(\.\.\/opus-report\.md\)/g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/opus-report.md)',
    )
    .replace(
      /\]\(\.\.\/public\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/public/',
    )
    .replace(
      /\]\(\.\.\/api\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/api/',
    )
    .replace(
      /\]\(\.\.\/server\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/server/',
    )
    .replace(
      /\]\(\.\.\/src\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/src/',
    )
    .replace(
      /\]\(\.\.\/scripts\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/scripts/',
    )
    .replace(
      /\]\(\.\.\/\.env\.example\)/g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/.env.example)',
    )
    .replace(
      /\]\(\.\.\/docs\//g,
      '](https://github.com/jondmarien/rngdle-unlocked/blob/main/docs/',
    );
}

const copies = [
  ['docs/ARCHITECTURE.md', 'Architecture.md'],
  ['docs/oauth-setup.md', 'OAuth.md'],
  ['docs/email-auth.md', 'Email-Auth.md'],
  ['docs/discord-bot.md', 'Discord-Bot.md'],
  ['docs/polar-monetization.md', 'Polar-Monetization.md'],
  ['docs/polar-checkout-foundation.md', 'Ranked-Plus-Checkout.md'],
  ['docs/refactor-notes-2026-07.md', 'Refactor-Notes.md'],
];

for (const [srcRel, dest] of copies) {
  const src = path.join(root, srcRel);
  if (!fs.existsSync(src)) continue;
  const body = rewriteWikiLinks(fs.readFileSync(src, 'utf8'));
  fs.writeFileSync(path.join(wikiDir, dest), body, 'utf8');
  console.log('refreshed', dest);
}

let fixed = 0;
for (const file of fs.readdirSync(wikiDir).filter((f) => f.endsWith('.md'))) {
  const p = path.join(wikiDir, file);
  const before = fs.readFileSync(p, 'utf8');
  let text = undoDoubleUtf8(before);
  text = toWikiSafe(text);
  if (text !== before) {
    fs.writeFileSync(p, text, 'utf8');
    fixed++;
    console.log('sanitized', file);
  } else {
    console.log('ok', file);
  }
}

const arch = fs.readFileSync(path.join(wikiDir, 'Architecture.md'));
const i = arch.indexOf(Buffer.from('Scramble'));
console.log('verify:', arch.slice(i, i + 40).toString('utf8'));
console.log('hex:', arch.slice(i, i + 30).toString('hex'));
console.log('done, sanitized', fixed, 'files');
