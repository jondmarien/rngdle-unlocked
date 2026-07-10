/**
 * Build-injected app version (`vite.config.ts` define ← `package.json`).
 *
 * Read through a narrow cast so call sites stay clean when a language service
 * (or Oxc) does not merge Vite's ambient `ImportMeta.env` into the program.
 */
type ViteAppEnv = {
  readonly VITE_APP_VERSION?: string;
};

export const APP_VERSION: string =
  (import.meta as ImportMeta & { readonly env: ViteAppEnv }).env
    .VITE_APP_VERSION ?? '0.0.0';
