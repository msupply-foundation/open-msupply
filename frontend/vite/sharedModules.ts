import type { Plugin } from 'vite';

/*
 * The plugin shared-module set (kdd/plugin-loading, kdd/bundling § R2).
 *
 * Plugins are single-file native ES modules that import these bare
 * specifiers; the host resolves them through the import map this plugin
 * injects into index.html. Each shared module is an EXTRA ROLLUP ENTRY of
 * the same host build — Rollup emits every module exactly once per build,
 * so the app's own imports and a plugin's import-map-resolved imports land
 * on the same live module instance (one Solid runtime, one SDK). No
 * `rollupOptions.external`, no second build.
 *
 * This list is public API: every addition is a compatibility commitment to
 * installed plugins and eager startup weight (a per-PR bundle-size event —
 * kdd/bundling). Additions need a reason recorded in kdd/plugin-loading.
 */

export interface SharedModule {
  /** The bare specifier a plugin bundle imports. */
  specifier: string;
  /** Rollup entry (chunk) name — also the key matched in the bundle. */
  entry: string;
  /** Repo-relative source of the facade module backing the entry. */
  source: string;
}

export const SHARED_MODULES: readonly SharedModule[] = [
  {
    specifier: 'solid-js',
    entry: 'shared-solid',
    source: 'src/plugin-runtime/shared/solid.ts',
  },
  {
    specifier: 'solid-js/web',
    entry: 'shared-solid-web',
    source: 'src/plugin-runtime/shared/solid-web.ts',
  },
  {
    specifier: 'solid-js/store',
    entry: 'shared-solid-store',
    source: 'src/plugin-runtime/shared/solid-store.ts',
  },
  {
    specifier: '@openmsupply/plugin-sdk',
    entry: 'shared-plugin-sdk',
    source: 'src/plugin-runtime/shared/sdk.ts',
  },
];

/** The `<script type="importmap">` body for a given URL resolver. */
export const buildImportMap = (url: (m: SharedModule) => string): string =>
  JSON.stringify({
    imports: Object.fromEntries(SHARED_MODULES.map(m => [m.specifier, url(m)])),
  });

export const sharedModulesPlugin = (): Plugin => {
  let base = '/';
  return {
    name: 'oms:shared-modules',
    config: () => ({
      build: {
        rollupOptions: {
          // 'exports-only' keeps each facade's re-exports intact without
          // inserting a wrapper chunk (a 'strict' default would add one; a
          // laxer setting would let Rollup drop the re-exports entirely).
          preserveEntrySignatures: 'exports-only',
          input: {
            index: 'index.html',
            ...Object.fromEntries(SHARED_MODULES.map(m => [m.entry, m.source])),
          },
        },
      },
    }),
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        // Dev serves the facade sources directly — Vite rewrites their
        // re-exports to the same optimised deps the app uses, so identity
        // holds in dev too. Build maps to the emitted entry chunks.
        const importMap = ctx.bundle
          ? buildImportMap(m => {
              const chunk = Object.values(ctx.bundle ?? {}).find(
                c => c.type === 'chunk' && c.isEntry && c.name === m.entry
              );
              if (!chunk) {
                throw new Error(
                  `sharedModulesPlugin: no entry chunk emitted for "${m.entry}" (${m.specifier})`
                );
              }
              return `${base}${chunk.fileName}`;
            })
          : buildImportMap(m => `${base}${m.source}`);
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: importMap,
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
};
