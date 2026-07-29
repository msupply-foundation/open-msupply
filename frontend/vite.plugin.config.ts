import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

/*
 * The DEPLOYABLE plugin build: one country plugin in `plugins/<dir>/` → one
 * self-contained ES module in `plugins/<dir>/dist/<code>.js`, installable by
 * the server CLI unchanged.
 *
 *   PLUGIN=civ pnpm build:plugin        (or: pnpm build:plugin civ)
 *
 * Deliberately NOT a mergeConfig over vite.config.ts. This config has no `@`
 * alias and does not alias `@openmsupply/plugin-sdk` to host source, so a
 * plugin that reaches into `src/` — the failure mode the old client's plugins
 * all had, bundling frozen copies of host code — simply fails to build. The
 * import boundary is enforced by resolution, not by review.
 *
 * The output shape is fixed by the server's transport
 * (spec/plugins/sdk-contract.md § packaging & transport):
 *
 * · ONE ES module file whose name starts with the plugin's code — the CLI's
 * entry
 *   detection is "a file whose name starts with the code", so
 *   `inlineDynamicImports` keeps it to a single chunk.
 * · CSS inlined INTO the JS, never emitted beside it: the server serves every
 *   plugin file as application/javascript, and a stray `<code>.css` in dist/
 *   can be picked as the entry point. `cssCodeSplit: false` plus lib mode
 *   would still emit a separate stylesheet, so plugin styles must be imported
 *   with `?inline` and injected — the CIV plugin styles entirely through SDK
 *   components and has none.
 * · No `main*` and no `LICENSE*` files — the transport drops those names, so a
 *   bundle that relied on one would install broken. Hence the explicit
 *   `entryFileNames` and `legalComments: 'none'`.
 *
 * `solid-js` and the SDK stay EXTERNAL: the host owns those instances (a second
 * `solid-js` copy breaks reactivity outright), and the bundle resolves them at
 * runtime through the host's import map. ⚠️ That host-side half — serving
 * import-map-addressable module URLs from a Vite app build — is kdd/bundling's
 * open R2 spike; until it lands, a bundle built here installs but only the
 * dev-link path actually runs the code.
 */

const directory = process.env.PLUGIN;
if (!directory)
  throw new Error(
    'vite.plugin.config.ts: set PLUGIN=<plugins/ subdirectory>, e.g. PLUGIN=civ'
  );

const root = new URL(`./plugins/${directory}/`, import.meta.url);
const manifest: unknown = JSON.parse(
  readFileSync(new URL('package.json', root), 'utf8')
);
if (
  typeof manifest !== 'object' ||
  manifest === null ||
  !('name' in manifest) ||
  typeof manifest.name !== 'string'
)
  throw new Error(`plugins/${directory}/package.json has no "name"`);

// The plugin code IS the package name (lower_snake_case, stable forever): it
// names the bundle file, the i18n namespace, and every plugin_data row.
const code = manifest.name;

const SHARED_SINGLETONS = [
  '@openmsupply/plugin-sdk',
  'solid-js',
  'solid-js/web',
  'solid-js/store',
];

export default defineConfig({
  plugins: [solid()],
  // The app's public/ must NOT be copied into a plugin's dist: the transport
  // base64s every file it finds there and the CLI's entry detection has no
  // extension check, so a stray favicon.svg becomes an installed plugin file.
  publicDir: false,
  build: {
    outDir: new URL('dist/', root).pathname,
    emptyOutDir: true,
    cssCodeSplit: false,
    sourcemap: false,
    // The server's install-time gate is on the plugin's version, not on syntax
    // level; match the app's own floor so a plugin can't out-modern its host.
    target: 'es2023',
    lib: {
      entry: new URL('src/plugin.tsx', root).pathname,
      formats: ['es'],
      fileName: () => `${code}.js`,
    },
    rollupOptions: {
      external: id => SHARED_SINGLETONS.includes(id),
      output: {
        entryFileNames: `${code}.js`,
        /*
         * One chunk, always: the transport serves a single entry file, so a
         * dynamic import Rollup split out would 404 at runtime.
         *
         * This lives on OUTPUT deliberately. Vite 8 reads `codeSplitting` only
         * from output options (`output.codeSplitting ?? …`), so a top-level
         * `build.codeSplitting: false` is silently ignored — it type-checks and
         * does nothing. `output.inlineDynamicImports` is the option that is
         * actually honoured today; it logs a deprecation notice pointing at
         * `codeSplitting`, so both are set: the working one, and the successor
         * for when it lands. `scripts/build-plugin.mjs` asserts the emitted file
         * count regardless, because a silently-ignored flag is exactly how this
         * was nearly missed.
         */
        inlineDynamicImports: true,
        codeSplitting: false,
      },
    },
  },
  esbuild: { legalComments: 'none' },
});
