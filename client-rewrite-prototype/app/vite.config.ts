import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build engine: Vite (see ../DECISIONS.md #2).
//
// Kept deliberately minimal and Module-Federation-compatible. The runtime
// plugin host (webpack Module Federation today) will be layered on here later
// via @module-federation/vite or equivalent; nothing in this config should
// preclude that. Notably: no exotic bundler tweaks, and React stays a normal
// dependency so it can be shared as a singleton across plugin remotes.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Deliberately NOT :3003 — that's the current front-end's dev/serve port
    // (packages/host). Using :3010 lets the existing app and this rewrite run
    // side by side for comparison. PORT can override (e.g. preview tooling that
    // assigns its own port); default stays :3010.
    port: Number(process.env.PORT) || 3010,
  },
});
