import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

/*
 * Dev server proxies GraphQL + custom translations to the mSupply backend
 * (default :8000; the auth-flow tests rely on 3005 → 8000). Override with
 * DEV_SERVER_PORT / GRAPHQL_PROXY_TARGET. LANG_VERSION busts the cached
 * translation dictionaries on a new production build (src/intl/dictionaryCache);
 * dev uses a fixed token so the cache is stable across reloads.
 */
export default defineConfig(({ mode }) => ({
  plugins: [solid()],
  define: {
    LANG_VERSION: JSON.stringify(mode === 'production' ? String(Date.now()) : 'dev'),
  },
  server: {
    port: Number(process.env.DEV_SERVER_PORT) || 3005,
    proxy: {
      '/graphql': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
      '/custom-translations': {
        target: process.env.GRAPHQL_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}))
