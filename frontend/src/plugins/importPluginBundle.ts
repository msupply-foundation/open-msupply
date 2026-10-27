import nativeImportUrl from './nativeImport.js?url&no-inline';

/*
 * Evaluate a plugin bundle at a URL — the loader's real `importBundle`
 * (./loader.ts).
 *
 * The bundle is imported by ./nativeImport.js, never by an `import()` here.
 * The build wraps every `import()` it compiles in Vite's preload helper, which
 * reports ANY rejection as `vite:preloadError` — the app's stale-bundle signal
 * (src/staleBundle.ts) — before the caller's catch sees it. That is right for
 * the app's own chunks, which only go missing when a new build replaces them.
 * A plugin bundle fails for reasons of its own (an SDK export this host no
 * longer has, a throw while evaluating) and fails again after every reload, so
 * it held the app behind "a new version is available" with no way past
 * (issue #575). Its failure belongs to the loader's catch: recorded, skipped,
 * the app running on.
 *
 * ./nativeImport.js is a `?url` asset, copied as written, so its `import()` is
 * the browser's own. `no-inline` keeps it a same-origin file rather than a
 * `data:` URL, and a file rather than code built at run time (`new Function`),
 * so a content security policy needs neither `data:` nor `unsafe-eval` for it.
 * Importing that file goes through the helper as any app chunk does — if it is
 * missing, the app really is stale.
 *
 * Shared specifiers inside the bundle (`solid-js`, `@openmsupply/plugin-sdk`)
 * resolve through the host's import map to the host's own live instances,
 * whichever module imports it (kdd/plugin-loading).
 */
export const importPluginBundle = async (url: string): Promise<unknown> => {
  const { default: nativeImport } = (await import(
    /* @vite-ignore */ nativeImportUrl
  )) as { default: (url: string) => Promise<unknown> };
  return nativeImport(url);
};
