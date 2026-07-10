/// <reference types="vite/client" />

/**
 * App-specific `import.meta.env` keys (merged with Vite's ImportMetaEnv).
 * Re-declare `ImportMeta.env` so IDE / Oxc language services that miss Vite's
 * ambient merge still resolve `import.meta.env` (CLI `tsc -p tsconfig.app.json`
 * is usually fine either way).
 */
interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {}
