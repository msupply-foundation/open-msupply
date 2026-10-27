// The browser's own dynamic import, for plugin bundles (see `importBundle` in
// ./loader.ts). Plain JavaScript taken as a `?url` asset, so the build copies
// it as written and never wraps this `import()` in its preload helper.
export default url => import(/* @vite-ignore */ url);
