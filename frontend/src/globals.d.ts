// Injected by the Vite `define` in vite.config.ts: the displayed build version
// (spec/startup/rules.md § App version) — the front end's own v* release line,
// decoupled from the server's version. A pipeline release shows the minted tag
// plus build stamp ("v0.0.82 (2ae7bd2)"); other checkout builds show git
// describe relative to the latest release ("v0.0.81-5-g89ccd1b5"); a
// checkout-less build (tarball/export) falls back to the bare package version.
declare const APP_VERSION: string;

// Also injected by vite.config.ts: the comma-separated `plugins/<dir>` names to
// dev-link into the host module graph (`DEV_PLUGINS=civ pnpm dev` —
// src/plugins/loader.ts). Always the empty string in a production build, so the
// dev-link branch and every plugin source it would import are eliminated.
declare const DEV_PLUGINS: string;

// The host's live singletons, published on `globalThis` before any INSTALLED
// plugin bundle evaluates: the rendezvous the SDK / solid-js shim modules read
// so a separately-built bundle shares the host's one reactivity graph
// (kdd/plugin-loading). Deliberately typed loosely — it is a bag of module
// namespaces whose only consumers are the shims.
declare namespace globalThis {
  // eslint-disable-next-line no-var
  var __oms__: Record<string, unknown> | undefined;
}
