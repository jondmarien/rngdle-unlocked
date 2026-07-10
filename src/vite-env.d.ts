/// <reference types="vite/client" />

/** App-specific `import.meta.env` keys (merged with Vite's ImportMetaEnv). */
interface ImportMetaEnv {
  readonly VITE_APP_URL?: string;
  readonly VITE_APP_VERSION?: string;
}

declare module '*.css' {}
