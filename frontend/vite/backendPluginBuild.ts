import type { InlineConfig, Plugin } from 'vite';

/*
 * The BACKEND plugin build preset — the sibling of `pluginBuild.ts`, for the
 * half that runs in the server's BoaJS engine instead of a browser.
 *
 * The format is set by how the server loads it
 * (server/service/src/boajs/call_method.rs): the bundle is parsed as ONE ES
 * module and the callable is looked up at the export path
 * `["plugins", "<type>"]`, so a conformant bundle is a single ES module
 * exporting `plugins`. The checks below fail the BUILD rather than let a
 * bundle be packed that the server would load and then fail to find a method
 * in.
 *
 * Two things a frontend plugin gets that this must NOT have:
 *   - bare imports. There is no import map here; anything the plugin needs is
 *     bundled in, so `external` is empty by construction.
 *   - host functions as imports. `sql`, `log`, `use_graphql` and the rest are
 *     bound as GLOBALS, and bound AFTER the module evaluates — so module
 *     top-level code may not call them, only the exported methods at call
 *     time. A plugin declares them ambiently (see the reference plugin's
 *     `host.d.ts`); out of tree they come from `@common/types`.
 *
 * NOT how the deployed CIV bundle is built: that one is built by the
 * open-msupply client toolchain (webpack + ts-loader + `backendCommon`) and
 * committed at `prebuilt/plugin.js`, which the packer ships verbatim. A
 * committed prebuilt always wins; this preset is for a plugin that has source
 * and no prebuilt.
 */

export interface BackendPluginBuildOptions {
  /** The plugin's entry module, relative to `root`. */
  entry: string;
  /** The plugin's code — diagnostics only; the emitted file is `plugin.js`. */
  code: string;
  /** Where the single file lands. */
  outDir: string;
  /** The plugin's directory, so it resolves its own entry and deps. */
  root: string;
}

/** The export the server looks the callable up under. */
const REQUIRED_EXPORT = 'plugins';

const conformancePlugin = (code: string): Plugin => {
  const fail = (message: string): never => {
    throw new Error(`backend plugin build (${code}): ${message}`);
  };
  return {
    name: 'oms:backend-plugin-conformance',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const outputs = Object.entries(bundle);
      const chunks = outputs.flatMap(([name, output]) =>
        output.type === 'chunk' ? [{ name, chunk: output }] : []
      );
      const assets = outputs.filter(([, output]) => output.type === 'asset');

      if (chunks.length !== 1) {
        fail(
          `expected exactly one JS chunk, got ${chunks.length} (${chunks
            .map(c => c.name)
            .join(', ')}) — BoaJS loads one module and resolves no others`
        );
      }
      if (assets.length > 0) {
        fail(
          `emitted assets, which a backend bundle cannot carry: ${assets
            .map(([name]) => name)
            .join(', ')}`
        );
      }

      const { name: chunkName, chunk } = chunks[0];
      if (chunkName !== 'plugin.js') {
        fail(`entry must be named "plugin.js", got "${chunkName}"`);
      }
      /*
       * The whole contract in one assertion. Without this export the server
       * loads the module fine and then fails to find the method — at call
       * time, on a real requisition, rather than here.
       */
      if (!chunk.exports.includes(REQUIRED_EXPORT)) {
        fail(
          `bundle must export \`${REQUIRED_EXPORT}\` (got: ${
            chunk.exports.join(', ') || 'nothing'
          }) — the server resolves methods at ["${REQUIRED_EXPORT}", "<type>"]`
        );
      }
      if (chunk.imports.length > 0) {
        fail(
          `bundle imports ${chunk.imports.join(', ')} — BoaJS provides no ` +
            'module resolution, so everything must be bundled in'
        );
      }
    },
  };
};

/** The Vite config a backend plugin builds with. */
export const backendPluginViteConfig = ({
  code,
  entry,
  outDir,
  root,
}: BackendPluginBuildOptions): InlineConfig => ({
  configFile: false,
  logLevel: 'warn',
  root,
  plugins: [conformancePlugin(code)],
  publicDir: false,
  build: {
    outDir,
    emptyOutDir: true,
    /*
     * Not a browser and not node: BoaJS is a bare ES2022-ish engine, so the
     * build must neither inject browser polyfills nor assume node built-ins.
     * `es2022` matches what the engine implements; anything newer would parse
     * on the server only by luck.
     */
    target: 'es2022',
    // Readable output: these bundles are read when a plugin misbehaves in a
    // engine with no debugger attached, and they never cross a network.
    minify: false,
    lib: {
      entry,
      formats: ['es'],
      fileName: () => 'plugin.js',
    },
    rollupOptions: { output: { codeSplitting: false } },
  },
});
