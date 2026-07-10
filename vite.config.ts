import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as {
  version: string;
};

// Vite+ defineConfig so `fmt` / `lint` are typed. Vercel still runs `vite build`
// via the build script; vite-plus re-exports a compatible Vite config.
export default defineConfig({
  fmt: {
    // Keep in sync with .oxfmtrc.json — single quotes are the repo standard.
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    printWidth: 80,
    tabWidth: 2,
    sortPackageJson: false,
    ignorePatterns: ['dist/**', 'node_modules/**', '.vercel/**', 'coverage/**'],
  },
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  // Proxy /api to vercel dev when running `vite` alone (optional)
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Vite 8 / Rolldown: codeSplitting replaces manualChunks / advancedChunks.
    // https://vite.dev/guide/migration · https://rolldown.rs/in-depth/manual-code-splitting
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)([\\/]|$)/,
              priority: 40,
            },
            {
              name: 'vendor-query',
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query([\\/]|$)/,
              priority: 30,
            },
            {
              name: 'vendor-auth',
              test: /[\\/]node_modules[\\/]better-auth([\\/]|$)/,
              priority: 20,
            },
            {
              name: 'vendor-zod',
              test: /[\\/]node_modules[\\/]zod([\\/]|$)/,
              priority: 10,
            },
          ],
        },
      },
    },
  },
});
