/// <reference types="vite/client" />

/**
 * App env keys (optional). Also re-declare `ImportMeta.env` so the IDE still
 * resolves `import.meta.env` when the language service does not pick up
 * Vite's ambient `ImportMeta` merge (CLI `tsc -p tsconfig.app.json` is fine).
 */
interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_VERSION?: string;
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.css' {}
