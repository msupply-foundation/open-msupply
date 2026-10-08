import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from './vite.config.ts';

/*
 * Standalone showcase build: `pnpm build:showcase` emits the component
 * showcase (src/ui-showcase/) as a self-contained static site in
 * dist-showcase/ — no backend, no auth; hash routing needs no host rewrite
 * rules. Extends the app config so plugins, defines (APP_VERSION,
 * LANG_VERSION) and VITE_BASE_PATH behave identically. The app build is
 * untouched: index.tsx's dev-only #/showcase branch still dead-code-
 * eliminates the showcase from it. See src/ui-showcase/README.md.
 */

const OUT_DIR = 'dist-showcase';

// The build's only page is showcase.html; rename the written file to
// index.html so the output directory drops onto a static host as-is.
const showcaseHtmlAsIndex: Plugin = {
  name: 'showcase-html-as-index',
  async writeBundle(options) {
    const dir = options.dir ?? OUT_DIR;
    await rename(join(dir, 'showcase.html'), join(dir, 'index.html'));
  },
};

export default defineConfig(env =>
  mergeConfig(baseConfig(env), {
    plugins: [showcaseHtmlAsIndex],
    build: {
      outDir: OUT_DIR,
      rollupOptions: { input: 'showcase.html' },
    },
  })
);
