/// <reference types="vite/client" />

/**
 * App-specific `import.meta.env` keys (merged with Vite's ImportMetaEnv).
 * Also re-declare `ImportMeta.env` so the IDE language service resolves
 * `import.meta.env` when it does not pick up Vite's ambient merge
 * (CLI `tsc -p tsconfig.app.json` is usually fine either way).
 */
interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {}
