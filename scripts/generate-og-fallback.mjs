/**
 * Generate server/assets/og-fallback.png — static brand card used when
 * /api/og PNG render fails (never serve SVG; Discord ignores it).
 *
 * Usage: node scripts/generate-og-fallback.mjs
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initWasm, Resvg } from '@resvg/resvg-wasm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsDir = join(root, 'server', 'assets');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1412"/>
      <stop offset="100%" stop-color="#1a2e28"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#5eead4" stroke-width="3" opacity="0.5"/>
  <text x="80" y="120" fill="#5eead4" font-family="Inter, ui-monospace, monospace" font-size="28" font-weight="700" letter-spacing="8">RNGDLE UNLOCKED</text>
  <text x="80" y="280" fill="#ecfdf5" font-family="Inter, system-ui, sans-serif" font-size="64" font-weight="800">Unlimited rolls</text>
  <text x="80" y="380" fill="#a7f3d0" font-family="Inter, system-ui, sans-serif" font-size="36" font-weight="600">CSPRNG · badges · EP · Arcade</text>
  <text x="1120" y="540" fill="#334155" font-family="Inter, system-ui, sans-serif" font-size="22" text-anchor="end">rngdle-unlocked.chron0.tech</text>
</svg>`;

async function main() {
  await mkdir(assetsDir, { recursive: true });

  const wasmSrc = join(
    root,
    'node_modules',
    '@resvg',
    'resvg-wasm',
    'index_bg.wasm',
  );
  const wasmDest = join(assetsDir, 'index_bg.wasm');
  try {
    await readFile(wasmDest);
  } catch {
    await copyFile(wasmSrc, wasmDest);
  }

  const wasm = await readFile(wasmDest);
  await initWasm(wasm);

  const fonts = await Promise.all(
    ['Inter-Regular.ttf', 'Inter-Bold.ttf'].map((name) =>
      readFile(join(assetsDir, name)),
    ),
  );

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: {
      fontBuffers: fonts.map((b) => new Uint8Array(b)),
      loadSystemFonts: false,
      defaultFontFamily: 'Inter',
      sansSerifFamily: 'Inter',
      monospaceFamily: 'Inter',
    },
  });
  const png = resvg.render().asPng();
  const out = join(assetsDir, 'og-fallback.png');
  await writeFile(out, png);
  const ok =
    png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47;
  if (!ok) {
    console.error('FAIL bad PNG magic');
    process.exit(1);
  }
  console.log(`ok wrote ${out} (${png.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
