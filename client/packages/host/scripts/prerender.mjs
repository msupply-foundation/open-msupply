/**
 * Injects the pre-rendered login-page HTML + critical CSS into dist/index.html.
 *
 * Run by prerenderPlugin (vite.config.ts) after:
 *   1. The main client build completes (dist/index.html exists)
 *   2. The SSR bundle is built (dist-ssr/entry-server.js exists)
 *
 * The injected HTML is hydrated transparently by React (see bootstrap.tsx).
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(__dirname, '..');

// Import the SSR bundle produced by `vite build --ssr src/entry-server.tsx`.
const { render } = await import(join(pkgRoot, 'dist-ssr/entry-server.js'));

const { html, css } = render();

const indexPath = join(pkgRoot, 'dist/index.html');
let indexHtml = readFileSync(indexPath, 'utf-8');

// Inject the pre-rendered HTML into the root container.
indexHtml = indexHtml.replace(
  '<div id="root"></div>',
  `<div id="root">${html}</div>`
);

// If the render produced separate CSS (e.g. from @emotion/server), inject it
// before </head> so it's available at the first paint.
if (css) {
  indexHtml = indexHtml.replace('</head>', `${css}\n</head>`);
}

writeFileSync(indexPath, indexHtml, 'utf-8');
console.log('[prerender] Patched dist/index.html with pre-rendered login page.');
