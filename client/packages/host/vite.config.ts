import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localesSourceDir = path.resolve(__dirname, '../common/src/intl/locales');

const localPlugins: { pluginPath: string; pluginCode: string }[] = (() => {
  try {
    return require('./getLocalPlugins.cjs') as {
      pluginPath: string;
      pluginCode: string;
    }[];
  } catch {
    return [];
  }
})();

// Serves locale JSON files from source in dev mode (mirrors CopyPlugin behaviour)
const serveLocalesPlugin: Plugin = {
  name: 'serve-locales',
  configureServer(server) {
    server.middlewares.use(
      '/locales',
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const urlPath = (req.url ?? '/').split('?')[0];
        const filePath = path.join(localesSourceDir, urlPath);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            res.setHeader('Content-Type', 'application/json');
            res.end(fs.readFileSync(filePath));
            return;
          }
        } catch {
          // file not found – fall through to next middleware
        }
        next();
      }
    );
  },
};

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    publicDir: 'public',

    plugins: [
      react(),
      // Resolves @common/* and other tsconfig path aliases defined in
      // the root client/tsconfig.json (followed via the extends chain).
      tsconfigPaths(),
      // Serve locale files from source in dev mode
      serveLocalesPlugin,
      // Copy locale files to dist/locales/ in production builds
      viteStaticCopy({
        targets: [
          {
            src: `${localesSourceDir}/**/*.json`,
            dest: 'locales',
          },
        ],
      }),
    ],

    define: {
      // API_HOST can be overridden at launch: API_HOST=https://... vite
      API_HOST: JSON.stringify(process.env['API_HOST'] ?? ''),
      LOCAL_PLUGINS: JSON.stringify(localPlugins),
      // Used by i18next for cache-busting translation files
      LANG_VERSION: JSON.stringify(String(Date.now())),
      'process.env.NODE_ENV': JSON.stringify(
        isProduction ? 'production' : 'development'
      ),
    },

    resolve: {
      // @mui/x-date-pickers v8 ESM build has broken internal imports
      // (missing "./esm" specifier / can't resolve @mui/material/styles from
      // its esm/ dir). Prefer the `require` (CJS) condition for all packages
      // to match the webpack `conditionNames: ['require', '...']` workaround.
      // This is safe now that all type-only re-exports use `export type`.
      conditions: ['require', 'module', 'browser', 'default'],
    },

    server: {
      port: 3003,
      open: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods':
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, content-type, Authorization',
      },
      // Allow Vite to serve files from workspace packages outside this
      // package root (e.g. packages/common/src/...)
      fs: {
        // Allow Vite to serve files from the repo root (e.g. root package.json imported for version)
        allow: [path.resolve(__dirname, '../../..')],
      },
    },

    preview: {
      port: 4173,
      proxy: {
        '/graphql': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: !isProduction,
      rollupOptions: {
        // Suppress MISSING_EXPORT errors for TypeScript type-only re-exports.
        // These are `export type Foo` declarations that esbuild strips from the
        // source modules; Rollup sees the re-exports in index files as broken,
        // but they have no runtime representation and are safe to ignore.
        // Webpack silently dropped these; we replicate that behaviour here.
        onLog(level, log, defaultHandler) {
          if (log.code === 'MISSING_EXPORT') return;
          defaultHandler(level, log);
        },
        output: {
          chunkFileNames: '[hash].js',
          entryFileNames: '[name].[hash].js',
        },
      },
    },
  };
});
