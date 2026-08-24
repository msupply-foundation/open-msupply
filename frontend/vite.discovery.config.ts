import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from './vite.config.ts';

/*
 * The desktop shell's bundled discovery page (spec/desktop): `pnpm
 * build:discovery` emits discovery.html + its assets as a self-contained
 * static page in dist-discovery/, for the desktop shell to load before any
 * server is chosen. A separate build (the showcase's pattern,
 * vite.showcase.config.ts) rather than a second input on the app build, so
 * the served app's chunk graph — tracked per PR in kdd/bundle-size-by-pr.md —
 * is untouched by this page sharing its modules. Extends the app config so
 * plugins, defines (APP_VERSION, LANG_VERSION) and VITE_BASE_PATH behave
 * identically. In dev the page needs no separate server: `pnpm dev` serves
 * /discovery.html with a mocked host bridge (src/desktop/entry.tsx).
 */

const OUT_DIR = 'dist-discovery';

// The build's only page is discovery.html; rename the written file to
// index.html so the output directory is loadable as-is (the shell points a
// window at the directory root).
const discoveryHtmlAsIndex: Plugin = {
  name: 'discovery-html-as-index',
  async writeBundle(options) {
    const dir = options.dir ?? OUT_DIR;
    await rename(join(dir, 'discovery.html'), join(dir, 'index.html'));
  },
};

export default defineConfig(env =>
  mergeConfig(baseConfig(env), {
    plugins: [discoveryHtmlAsIndex],
    build: {
      outDir: OUT_DIR,
      rollupOptions: { input: 'discovery.html' },
    },
  })
);
