import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standard Vite config so Vercel/CI can build without the global `vp` CLI.
// Locally you can still use `vp dev` / `vp test` / `vp check` via vite-plus.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Proxy /api to vercel dev when running `vite` alone (optional)
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})

