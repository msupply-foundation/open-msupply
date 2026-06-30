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
    // Matches the existing host dev-server port so backend CORS / discovery
    // expectations carry over unchanged.
    port: 3003,
  },
});
