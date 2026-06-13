import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:8000';

  return {
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
