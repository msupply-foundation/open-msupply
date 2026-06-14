import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// Shared client/server version lives in the repo-root package.json (same source
// the legacy client uses for its "App version"). Inlined at build time.
const appVersion = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
).version as string;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8000';

  return {
    define: { __APP_VERSION__: JSON.stringify(appVersion) },
    plugins: [
      // Must run before the React plugin so generated routes get HMR/code-splitting.
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3004,
      // Same-origin in dev: proxy server routes so there's no CORS and the auth
      // cookie stays on the app origin. Override the target via VITE_API_TARGET.
      proxy: {
        '/graphql': { target: apiTarget, changeOrigin: true, ws: true },
        '/files': { target: apiTarget, changeOrigin: true },
        '/sync_files': { target: apiTarget, changeOrigin: true },
      },
    },
  };
});
