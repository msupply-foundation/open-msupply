// Injected by the Vite `define` in vite.config.ts: the displayed build version
// (spec/startup/rules.md § App version) — the front end's own v* release line,
// decoupled from the server's version. A pipeline release shows the minted tag
// plus build stamp ("v0.0.82 (2ae7bd2)"); other checkout builds show git
// describe relative to the latest release ("v0.0.81-5-g89ccd1b5"); a
// checkout-less build (tarball/export) falls back to the bare package version.
declare const APP_VERSION: string;
