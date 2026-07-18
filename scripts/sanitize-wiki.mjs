/**
 * Fix wiki staging encoding issues and ASCII-sanitize for GitHub Wiki Mermaid.
 *
 * - Undoes classic double-UTF-8 mojibake (Â·, â€", etc.)
 * - Replaces arrows / middots / dashes that break Mermaid on GitHub
 * - Strips pipes from Mermaid node labels (pipes are edge-label syntax)
 * - Refreshes pages copied from docs/*.md
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
    // Use " / " not " | " — pipes inside Mermaid node labels [..] break GitHub's parser.
    .replace(/\s*\u00b7\s*/g, ' / ')
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

/**
 * Inside ```mermaid fences:
 * - Keep edge labels `-->|text|`
 * - Convert other `|` separators to ` / ` (node labels, message text)
 * - Quote decision nodes that contain `#`
 */
function fixMermaidSyntax(text) {
  return text.replace(/```mermaid\n([\s\S]*?)```/g, (_m, body) => {
    const edges = [];
    let fixed = body.replace(/-->\|[^|\n]+\|/g, (match) => {
      edges.push(match);
      return `__MERMAID_EDGE_${edges.length - 1}__`;
    });

    fixed = fixed.replace(/\s*\|\s*/g, ' / ');

    fixed = fixed.replace(/__MERMAID_EDGE_(\d+)__/g, (_mm, i) => edges[Number(i)]);

    // `#` in unquoted {} / [] labels breaks GitHub Mermaid — quote those labels.
    fixed = fixed.replace(
      /(\b\w+)\{([^}"\n]*#[^}\n]*)\}/g,
      (_mm, id, inner) => `${id}{"${inner.replace(/"/g, "'")}"}`,
    );
    fixed = fixed.replace(
      /(\b\w+)\[([^\]"\n]*#[^\]\n]*)\]/g,
      (_mm, id, inner) => `${id}["${inner.replace(/"/g, "'")}"]`,
    );

    return '```mermaid\n' + fixed + '```';
  });
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

let fixedCount = 0;
for (const file of fs.readdirSync(wikiDir).filter((f) => f.endsWith('.md'))) {
  const p = path.join(wikiDir, file);
  const before = fs.readFileSync(p, 'utf8');
  let text = undoDoubleUtf8(before);
  text = toWikiSafe(text);
  text = fixMermaidSyntax(text);
  if (text !== before) {
    fs.writeFileSync(p, text, 'utf8');
    fixedCount++;
    console.log('sanitized', file);
  } else {
    console.log('ok', file);
  }
}

const arch = fs.readFileSync(path.join(wikiDir, 'Architecture.md'), 'utf8');
const badge = arch.includes('Local[Codex / NEW filter / NEW ribbon]');
const edgeOk = arch.includes('Diff -->|yes| Act');
const scramble = arch.includes('Scramble reel / ??? EP');
console.log('checks:', { badge, edgeOk, scramble });
console.log('done, sanitized', fixedCount, 'files');
