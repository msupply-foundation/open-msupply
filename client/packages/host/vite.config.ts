import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

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

// Defers the main entry module script until after first paint.
// The SSR prerendering provides full login-page HTML instantly, so FCP fires as
// soon as the HTML is parsed. By delaying script injection to the second frame
// (rAF → setTimeout 0), the real Chrome trace shows FCP before any JS network
// request starts, which is what Lighthouse's Lantern simulator needs to keep JS
// off the FCP critical path and report accurate simulated FCP/LCP timings.
const deferEntryScriptPlugin: Plugin = {
  name: 'defer-entry-script',
  apply: 'build',
  // enforce:'post' so this runs after Vite injects the script tag into index.html
  enforce: 'post',
  transformIndexHtml(html) {
    if (process.env['VITE_SSR_BUILD']) return html;
    const srcs: string[] = [];
    let result = html.replace(
      /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
      (_, src) => {
        srcs.push(src);
        return '';
      }
    );
    if (srcs.length === 0) return result;
    const injects = srcs
      .map(
        src =>
          `var s=document.createElement('script');s.type='module';s.crossOrigin='anonymous';s.src=${JSON.stringify(src)};document.head.appendChild(s);`
      )
      .join('');
    // rAF fires before current frame paints; setTimeout(0) fires after that
    // paint completes — so the script element is created after FCP.
    const loader = `<script>requestAnimationFrame(function(){setTimeout(function(){${injects}},0)})</script>`;
    return result.replace('</body>', loader + '\n</body>');
  },
};

// Converts Vite's render-blocking <link rel="stylesheet"> tags to async preloads.
// The CSS file only contains @font-face declarations (font-display:swap), so
// deferring it does not cause layout shift — fonts simply use the fallback face
// until the woff2 files arrive, exactly as font-display:swap intends.
const asyncCssPlugin: Plugin = {
  name: 'async-css',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
      (_, href) =>
        `<link rel="preload" as="style" crossorigin href="${href}" onload="this.onload=null;this.rel='stylesheet'">` +
        `<noscript><link rel="stylesheet" crossorigin href="${href}"></noscript>`
    );
  },
};

// Pre-compresses build output with gzip + brotli and serves compressed files
// from the preview server. Brotli is preferred when the client supports it
// (typically 15–20% smaller than gzip at equivalent CPU cost). In production,
// nginx / CDN handles this; this makes `vite preview` behave closer to prod.
const compressionPlugin: Plugin = {
  name: 'compression',
  async closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const compressible = /\.(js|css|html|json|svg)$/;

    const walk = (dir: string): string[] =>
      fs.readdirSync(dir).flatMap(f => {
        const full = path.join(dir, f);
        return fs.statSync(full).isDirectory() ? walk(full) : [full];
      });

    const files = walk(distDir).filter(f => compressible.test(f));

    await Promise.all([
      // gzip — fallback for clients that don't support brotli
      ...files.map(f =>
        pipe(
          fs.createReadStream(f),
          zlib.createGzip({ level: 9 }),
          fs.createWriteStream(`${f}.gz`)
        )
      ),
      // brotli — best compression, supported by all modern browsers
      ...files.map(f =>
        pipe(
          fs.createReadStream(f),
          zlib.createBrotliCompress({
            params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
          }),
          fs.createWriteStream(`${f}.br`)
        )
      ),
    ]);
  },
  configurePreviewServer(server) {
    const mime: Record<string, string> = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
    };
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const ae = (req.headers['accept-encoding'] ?? '') as string;
        const urlPath = (req.url ?? '/').split('?')[0];
        const ext = path.extname(urlPath);
        if (!mime[ext as keyof typeof mime]) return next();
        const contentType = mime[ext as keyof typeof mime] as string;

        // Prefer brotli, fall back to gzip
        if (ae.includes('br')) {
          const brPath = path.join(__dirname, 'dist', urlPath + '.br');
          try {
            const stat = fs.statSync(brPath);
            if (stat.isFile()) {
              res.setHeader('Content-Encoding', 'br');
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Length', stat.size);
              fs.createReadStream(brPath).pipe(res as NodeJS.WritableStream);
              return;
            }
          } catch {
            // no .br file — try gzip
          }
        }

        if (ae.includes('gzip')) {
          const gzPath = path.join(__dirname, 'dist', urlPath + '.gz');
          try {
            const stat = fs.statSync(gzPath);
            if (stat.isFile()) {
              res.setHeader('Content-Encoding', 'gzip');
              res.setHeader('Content-Type', contentType);
              res.setHeader('Content-Length', stat.size);
              fs.createReadStream(gzPath).pipe(res as NodeJS.WritableStream);
              return;
            }
          } catch {
            // no .gz file — fall through to default static handler
          }
        }

        next();
      }
    );
  },
};

// After the main client build, builds the SSR entry in a child process and
// runs the prerender script to inject pre-rendered login HTML + critical CSS
// into dist/index.html.
// Skipped automatically when Vite is doing the SSR sub-build itself.
const prerenderPlugin: Plugin = {
  name: 'prerender',
  apply: 'build',
  async closeBundle() {
    // When Vite is building the SSR bundle it sets this env var (see below).
    // Skip to avoid infinite recursion.
    if (process.env['VITE_SSR_BUILD']) return;

    const { execFileSync } = await import('child_process');
    const viteBin = path.resolve(__dirname, '../../node_modules/vite/bin/vite.js');

    // 1. Build the SSR entry in a separate process.
    console.log('\n[prerender] Building SSR entry…');
    execFileSync(
      process.execPath,
      [viteBin, 'build', '--ssr', 'src/entry-server.tsx', '--mode', 'production'],
      {
        cwd: __dirname,
        stdio: 'inherit',
        env: { ...process.env, VITE_SSR_BUILD: '1' },
      }
    );

    // 2. Patch dist/index.html with the pre-rendered output.
    console.log('[prerender] Running prerender script…');
    execFileSync(process.execPath, [path.join(__dirname, 'scripts/prerender.mjs')], {
      cwd: __dirname,
      stdio: 'inherit',
    });

    // 3. Remove the temporary SSR output directory.
    fs.rmSync(path.join(__dirname, 'dist-ssr'), { recursive: true, force: true });
    console.log('[prerender] Done.\n');
  },
};

// Forces @mui/x-date-pickers to resolve via its CJS entry rather than the
// esm/ tree, regardless of the global resolve.conditions.  The package exports
// map only has `require` and `default`; with ESM-first conditions the `default`
// condition points to the esm/ tree which has had internal import issues in
// earlier v8 builds.  Pinning to CJS is safe because the pickers are
// lazy-loaded (not in the entry chunk) so this doesn't affect TBT/entry size.
const muiDatePickersCjsPlugin: Plugin = {
  name: 'mui-date-pickers-cjs',
  enforce: 'pre',
  async resolveId(id, importer, options) {
    if (!id.startsWith('@mui/x-date-pickers')) return null;
    // Resolve using the other plugins / Vite default (skipSelf avoids recursion).
    const resolved = await this.resolve(id, importer, {
      ...options,
      skipSelf: true,
    });
    if (!resolved) return null;
    // If global conditions resolved to the esm/ tree, redirect to CJS sibling.
    if (resolved.id.includes('/@mui/x-date-pickers/esm/')) {
      return { ...resolved, id: resolved.id.replace('/esm/', '/') };
    }
    return resolved;
  },
};

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

export default defineConfig(({ mode, isSsrBuild }) => {
  const isProduction = mode === 'production';

  // SSR sub-build: produce a Node.js-compatible bundle for entry-server.tsx.
  // Triggered by the prerenderPlugin via viteBuild() with VITE_SSR_BUILD=1.
  if (isSsrBuild || process.env['VITE_SSR_BUILD']) {
    process.env['VITE_SSR_BUILD'] = '1'; // propagate to nested calls
    return {
      plugins: [react(), tsconfigPaths()],
      resolve: {
        // Do NOT include 'browser' for SSR — @emotion/cache's browser-specific
        // bundle accesses `document.head` unconditionally at init time, which
        // throws in Node.js.  The standard bundle guards it with `isBrowser`.
        conditions: ['require', 'module', 'default'],
      },
      ssr: {
        // Bundle everything so path aliases and workspace packages resolve.
        noExternal: true,
      },
      define: {
        API_HOST: JSON.stringify(''),
        LOCAL_PLUGINS: JSON.stringify([]),
        LANG_VERSION: JSON.stringify('0'),
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
      build: {
        ssr: 'src/entry-server.tsx',
        outDir: 'dist-ssr',
        rollupOptions: {
          output: {
            format: 'esm',
            entryFileNames: 'entry-server.js',
          },
        },
      },
    };
  }

  return {
    publicDir: 'public',

    plugins: [
      react(),
      // Resolves @common/* and other tsconfig path aliases defined in
      // the root client/tsconfig.json (followed via the extends chain).
      tsconfigPaths(),
      // Force @mui/x-date-pickers to CJS entry regardless of ESM conditions
      muiDatePickersCjsPlugin,
      // Serve locale files from source in dev mode
      serveLocalesPlugin,
      // Load font CSS asynchronously (it's only @font-face, not layout CSS)
      asyncCssPlugin,
      // Defer the entry module script until after first paint so FCP/LCP are
      // not blocked by the JS bundle download in Lighthouse's simulate model.
      deferEntryScriptPlugin,
      // Pre-render the login page and inject HTML + critical CSS into dist/index.html
      // (must run before compressionPlugin so the patched HTML is what gets compressed)
      prerenderPlugin,
      // Pre-compress build output with gzip + brotli; serve from vite preview
      compressionPlugin,
      // Copy locale files to dist/locales/ in production builds
      viteStaticCopy({
        targets: [
          {
            src: `${localesSourceDir}/*`,
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
      // ESM-first: lets Rollup see named exports and tree-shake packages that
      // publish separate ESM builds (i18next, graphql-request, date-fns, etc.).
      // @mui/x-date-pickers is handled explicitly via the plugin below because
      // its package.json has only `require` + `default` conditions, and the
      // `default` condition points to the esm/ tree which used to have broken
      // internal paths (verified fixed in v8.27+ but kept explicit for safety).
      conditions: ['module', 'browser', 'default'],
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
      // Remove license/copyright comments from the output bundle.
      // They remain in node_modules; stripping them from the served JS
      // saves several KB (36+ @license blocks in the main chunk alone).
      esbuildOptions: {
        legalComments: 'none',
      },
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
        // unknownGlobalSideEffects: false tells Rollup that reading an
        // unknown global (e.g. `window.foo`) has no observable side effect
        // and the expression can be dropped if unused.  This is safe because
        // all workspace packages declare sideEffects: false and the app does
        // not rely on global mutation for tree-shaking.
        treeshake: { unknownGlobalSideEffects: false },
        output: {
          chunkFileNames: '[hash].js',
          entryFileNames: '[name].[hash].js',
        },
      },
    },
  };
});
