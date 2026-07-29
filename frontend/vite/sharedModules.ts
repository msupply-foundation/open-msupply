import type {
  HtmlTagDescriptor,
  IndexHtmlTransformContext,
  Plugin,
} from 'vite';

/*
 * The build output as `transformIndexHtml` receives it. Derived from Vite's own
 * context type rather than imported from the bundler, so it cannot drift.
 * `viteMetadata` is Vite's per-chunk record of the CSS that chunk needs
 * (vite/types/metadata.d.ts); it is declared here because Vite augments the
 * bundler's types under a module specifier this project does not resolve.
 */
type OutputBundle = NonNullable<IndexHtmlTransformContext['bundle']>;
type OutputChunk = Extract<OutputBundle[string], { type: 'chunk' }> & {
  viteMetadata?: { importedCss?: Iterable<string> };
};

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

/** The SDK entry whose CSS the host must link (the UI-kit re-exports). */
const SDK_ENTRY = 'shared-plugin-sdk';

/**
 * Every CSS asset an entry chunk needs, transitively.
 *
 * The SDK re-exports CSS-bearing host components (Table, InfoTooltip), so its
 * entry chunk owns a stylesheet — and NOTHING links it: the app's own
 * `<link>`s cover the app's entry, and the SDK entry is fetched at runtime by a
 * plugin's import-map resolution, where an ES import cannot pull in a
 * stylesheet. Without this the host would serve unstyled plugin markup
 * (kdd/bundling § Externalisation, the SDK-CSS rule).
 *
 * Walks the chunk graph rather than reading the entry's own `importedCss`,
 * because a component's CSS is attributed to whichever chunk its module landed
 * in — which may be one the SDK entry merely imports.
 */
const entryCssFiles = (
  bundle: OutputBundle,
  entryName: string
): readonly string[] => {
  const chunks = new Map<string, OutputChunk>();
  for (const output of Object.values(bundle))
    if (output.type === 'chunk') chunks.set(output.fileName, output);
  const entry = [...chunks.values()].find(
    chunk => chunk.isEntry && chunk.name === entryName
  );
  if (!entry) return [];

  const css = new Set<string>();
  const visited = new Set<string>();
  const walk = (chunk: OutputChunk): void => {
    if (visited.has(chunk.fileName)) return;
    visited.add(chunk.fileName);
    for (const file of chunk.viteMetadata?.importedCss ?? []) css.add(file);
    for (const imported of chunk.imports) {
      const next = chunks.get(imported);
      if (next) walk(next);
    }
  };
  walk(entry);
  return [...css];
};

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
      handler(html, ctx) {
        // Dev serves the facade sources directly — Vite rewrites their
        // re-exports to the same optimised deps the app uses, so identity
        // holds in dev too (and a CSS module imported through the SDK injects
        // its own <style>, so dev needs no link). Build maps to the emitted
        // entry chunks.
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
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: importMap,
            injectTo: 'head-prepend',
          },
        ];
        // The SDK's own stylesheets, minus any the app's entry already links
        // (a shared file is one document's stylesheet either way).
        if (ctx.bundle) {
          for (const file of entryCssFiles(ctx.bundle, SDK_ENTRY)) {
            const href = `${base}${file}`;
            if (html.includes(href)) continue;
            tags.push({
              tag: 'link',
              attrs: { rel: 'stylesheet', crossorigin: '', href },
              injectTo: 'head',
            });
          }
        }
        return tags;
      },
    },
  };
};
