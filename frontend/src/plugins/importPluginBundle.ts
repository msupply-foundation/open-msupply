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
 * a wrapped `import()` would hold the app behind "a new version is available"
 * with no way past. A plugin's failure belongs to the loader's catch instead:
 * recorded, skipped, the app running on.
 *
 * ./nativeImport.js is a `?url` asset, copied as written, so its `import()` is
 * the browser's own. `no-inline` is load-bearing: the file is under Vite's
 * inline limit, and inlined it becomes a `data:` module, against which the
 * root-relative `/frontend_plugins/…` URL cannot resolve — every plugin would
 * fail to load. As a same-origin file, and not code built at run time
 * (`new Function`), it also asks a content security policy for neither
 * `data:` nor `unsafe-eval`. Importing that file goes through the helper as
 * any app chunk does — if it is missing, the app really is stale.
 *
 * Shared specifiers inside the bundle (`solid-js`, `@openmsupply/plugin-sdk`)
 * resolve through the host's import map to the host's own live instances,
 * whichever module imports it (kdd/plugin-loading). Those are app chunks too,
 * but the bundle fetches them with the browser's own `import()`, outside the
 * helper: one gone missing is a stale app recorded as this plugin failing to
 * load. That misreport does not outlast a reload, which brings the new build's
 * import map.
 */
export const importPluginBundle = async (url: string): Promise<unknown> => {
  const { default: nativeImport } = (await import(
    /* @vite-ignore */ nativeImportUrl
  )) as { default: (url: string) => Promise<unknown> };
  return nativeImport(url);
};
