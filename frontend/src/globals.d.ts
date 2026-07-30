// Injected by the Vite `define` in vite.config.ts: the displayed build version
// (spec/startup/rules.md § App version) — the front end's own v* release line,
// decoupled from the server's version. A pipeline release shows the minted tag
// plus build stamp ("v0.0.82 (2ae7bd2)"); other checkout builds show git
// describe relative to the latest release ("v0.0.81-5-g89ccd1b5"); a
// checkout-less build (tarball/export) falls back to the bare package version.
declare const APP_VERSION: string;

// The plugin system's diagnostics handle, published by the loader
// (src/plugins/loader.ts) once per app lifetime. NOT a module-identity
// mechanism — shared singletons reach plugins through the import map
// (kdd/plugin-loading) — just a live read-only window for a support session, a
// production-path walk, or an e2e assertion: which plugins loaded, what was
// refused and why, and which plugin API this build provides. Absent until the
// boot gate runs, so every read must tolerate `undefined`.
// eslint-disable-next-line no-var -- a mutable global must be declared with `var`.
declare var __oms__:
  | {
      PLUGIN_API_VERSION: number;
      plugins: () => readonly import('./plugins/registry').LoadedPlugin[];
      diagnostics: () => readonly import('./plugins/diagnostics').PluginDiagnostic[];
    }
  | undefined;
