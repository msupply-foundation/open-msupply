import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { defineConfig, mergeConfig, type Plugin } from 'vite';
import baseConfig from './vite.config.ts';

/*
 * Standalone prototypes build: `pnpm build:prototypes` emits the design
 * prototypes area (src/prototypes/) as a self-contained static site in
 * dist-prototypes/ — no backend, no auth; hash routing needs no host rewrite
 * rules. Extends the app config so plugins, defines (APP_VERSION, LANG_VERSION)
 * and VITE_BASE_PATH behave identically. The app build is untouched: index.tsx's
 * dev-only #/prototypes branch still dead-code-eliminates the tree from it.
 *
 * A direct sibling of vite.showcase.config.ts — same shape, different entry and
 * outDir. Kept as its own config rather than a parameterised shared one: two
 * ~30-line configs read more plainly than one indirection, and the two areas are
 * deliberately independent. See src/prototypes/README.md.
 */

const OUT_DIR = 'dist-prototypes';

// The build's only page is prototypes.html; rename the written file to
// index.html so the output directory drops onto a static host as-is.
const prototypesHtmlAsIndex: Plugin = {
  name: 'prototypes-html-as-index',
  async writeBundle(options) {
    const dir = options.dir ?? OUT_DIR;
    await rename(join(dir, 'prototypes.html'), join(dir, 'index.html'));
  },
};

export default defineConfig(env =>
  mergeConfig(baseConfig(env), {
    plugins: [prototypesHtmlAsIndex],
    build: {
      outDir: OUT_DIR,
      rollupOptions: { input: 'prototypes.html' },
    },
  })
);
