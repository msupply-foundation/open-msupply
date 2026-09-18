import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { InlineConfig, Plugin } from 'vite';
import solid from 'vite-plugin-solid';
import { SHARED_MODULES } from './sharedModules.ts';

/*
 * The plugin build preset (spec/plugins/sdk-contract.md § packaging &
 * transport) — published to out-of-tree authors as
 * `@openmsupply/plugin-sdk/vite`.
 *
 * A conformant bundle is ONE minified ES module named `${code}.js`, with CSS
 * inlined and dynamic imports flattened, importing nothing but the shared
 * module set (which the host's import map resolves to its own live instances).
 * The server's transport fixes all of that: it serves the dist file whose name
 * starts with the plugin code and drops anything named `main*` or containing
 * `LICENSE`, so a build that emits a second chunk or a stylesheet silently
 * loses it. The post-build checks below therefore fail the BUILD rather than
 * let a broken bundle be packed.
 */

export interface PluginBuildOptions {
  /** The plugin's entry module, relative to `root`. */
  entry: string;
  /**
   * The plugin's code; names the emitted file. Defaults to the `name` in the
   * plugin's own package.json — the same field the server CLI treats as the
   * plugin code, so the two can never disagree. Override only for a build
   * that deliberately mislabels itself (tests).
   */
  code?: string;
  /** Where the single file lands — the CLI reads `{pluginDir}/dist`. */
  outDir?: string;
  /**
   * The plugin's version — diagnostics only, so failures name the build.
   * Defaults to the package.json `version` (the install compatibility gate's
   * field), like `code`.
   */
  version?: string;
  /**
   * The plugin's directory. Defaults to the working directory, which is what
   * `yarn build-plugin` gives; a driver building several plugins at once sets
   * it per plugin so each resolves its own entry and dependencies.
   */
  root?: string;
}

/**
 * The plugin identity declared in `${root}/package.json` — `name` is the
 * plugin code (what the server CLI packs and routes by), `version` the field
 * its install gate compares. Reading it here keeps a plugin's vite config
 * free of restating either.
 */
export const pluginPackageIdentity = (
  root: string
): { code: string; version?: string } => {
  const path = join(root, 'package.json');
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (cause) {
    throw new Error(`plugin build: cannot read ${path}`, { cause });
  }
  const record = parsed as { name?: unknown; version?: unknown };
  if (typeof record.name !== 'string' || record.name === '') {
    throw new Error(
      `plugin build: ${path} has no "name" — the package name IS the plugin code`
    );
  }
  return {
    code: record.name,
    version: typeof record.version === 'string' ? record.version : undefined,
  };
};

const SHARED_SPECIFIERS = SHARED_MODULES.map(m => m.specifier);

/*
 * A plugin's imports stay bare — the inverse of the host rule. Subpaths count
 * too, so a specifier is matched by prefix; whether the import map actually
 * provides the subpath is then checked against SHARED_MODULES on the emitted
 * chunk (below), which is where an unprovided one would otherwise fail at load
 * time in the browser.
 */
const isSharedImport = (id: string): boolean =>
  SHARED_SPECIFIERS.some(
    specifier => id === specifier || id.startsWith(`${specifier}/`)
  );

const conformancePlugin = ({
  code,
  version,
}: Pick<PluginBuildOptions, 'code' | 'version'>): Plugin => {
  const label = version ? `${code}@${version}` : code;
  const fail = (message: string): never => {
    throw new Error(`plugin build (${label}): ${message}`);
  };
  return {
    name: 'oms:plugin-conformance',
    // 'post' so this runs AFTER Vite's own CSS plugin has emitted the collected
    // stylesheet — a normal-order hook would inspect the bundle before it
    // exists and let it through.
    enforce: 'post',
    generateBundle(_options, bundle) {
      const outputs = Object.entries(bundle);
      const chunks = outputs.flatMap(([name, output]) =>
        output.type === 'chunk' ? [{ name, chunk: output }] : []
      );
      const assets = outputs.flatMap(([name, output]) =>
        output.type === 'asset' ? [{ name, asset: output }] : []
      );

      if (chunks.length !== 1) {
        fail(
          `expected exactly one JS chunk, got ${chunks.length} (${chunks
            .map(c => c.name)
            .join(', ')}) — dynamic imports must be inlined`
        );
      }
      const { name: chunkName, chunk } = chunks[0];
      if (chunkName !== `${code}.js`) {
        fail(`entry must be named "${code}.js", got "${chunkName}"`);
      }

      // Every remaining import must be one the host's import map provides;
      // anything else would throw on `import()` in the browser.
      const unknown = chunk.imports.filter(
        id => !SHARED_SPECIFIERS.includes(id)
      );
      if (unknown.length > 0) {
        fail(
          `bundle imports specifiers the host does not provide: ${unknown.join(
            ', '
          )} — a plugin may import only ${SHARED_SPECIFIERS.join(', ')}`
        );
      }

      /*
       * `cssCodeSplit: false` collects every stylesheet into one asset, which
       * the transport would drop. Fold it into the module as a <style> the
       * bundle injects on evaluation — bespoke plugin styles must be
       * self-contained (sdk-contract § styling).
       */
      const stylesheets = assets.filter(a => a.name.endsWith('.css'));
      const others = assets.filter(a => !a.name.endsWith('.css'));
      if (others.length > 0) {
        fail(
          `emitted non-CSS assets the transport would drop: ${others
            .map(a => a.name)
            .join(', ')} — inline them (import as a data URI or a string)`
        );
      }
      if (stylesheets.length > 1) {
        fail(
          `expected at most one stylesheet, got ${stylesheets.length} — set cssCodeSplit: false`
        );
      }
      for (const { name, asset } of stylesheets) {
        const raw =
          typeof asset.source === 'string'
            ? asset.source
            : Buffer.from(asset.source).toString('utf8');
        // Vite's own chunk-ordering markers, which it strips only on the paths
        // that inline CSS themselves.
        const css = raw.replaceAll(/\/\*\$vite\$:\d+\*\//g, '').trim();
        chunk.code =
          `(()=>{const s=document.createElement("style");` +
          `s.textContent=${JSON.stringify(css)};` +
          `document.head.append(s);})();\n` +
          chunk.code;
        delete bundle[name];
      }
    },
  };
};

/**
 * The Vite config a plugin builds with. Everything a conformant bundle needs is
 * here, so a plugin's own `vite.config` is one call.
 */
export const pluginViteConfig = (options: PluginBuildOptions): InlineConfig => {
  // One source of truth for identity: package.json, unless a caller (the
  // multi-plugin driver, a deliberately-mislabelled test build) overrides.
  const declared =
    options.code === undefined || options.version === undefined
      ? pluginPackageIdentity(options.root ?? process.cwd())
      : { code: options.code, version: options.version };
  return pluginViteConfigResolved({
    entry: options.entry,
    outDir: options.outDir ?? 'dist',
    root: options.root,
    code: options.code ?? declared.code,
    version: options.version ?? declared.version,
  });
};

const pluginViteConfigResolved = ({
  code,
  entry,
  outDir,
  version,
  root,
}: Required<Pick<PluginBuildOptions, 'code' | 'entry' | 'outDir'>> &
  Pick<PluginBuildOptions, 'version' | 'root'>): InlineConfig => ({
  configFile: false,
  logLevel: 'warn',
  root,
  plugins: [solid(), conformancePlugin({ code, version })],
  // The host's public/ (locales, icons) must not be copied beside the bundle.
  publicDir: false,
  /*
   * NB: no `legalComments: 'none'` — Vite 8's `esbuild` option is deprecated
   * (Oxc does the transform) and its `legalComments` was never honoured for
   * minification anyway. The invariant it was there for is enforced directly
   * instead: the conformance check above fails on ANY non-CSS asset, so a
   * `*.LICENSE.txt` extracted beside the bundle stops the build rather than
   * being silently dropped by the transport.
   */
  build: {
    outDir,
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry,
      formats: ['es'],
      fileName: () => `${code}.js`,
    },
    rollupOptions: {
      external: (id: string) => isSharedImport(id),
      // One file: a dynamic import inside a plugin becomes part of the bundle
      // rather than a second chunk the transport would drop.
      output: { codeSplitting: false },
    },
  },
});
