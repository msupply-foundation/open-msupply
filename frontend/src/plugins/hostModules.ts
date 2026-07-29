/*
 * The host's live SDK, published at the rendezvous a separately-built plugin
 * bundle resolves against (kdd/plugin-loading § decision 1 and § old-engine
 * fallback).
 *
 * An INSTALLED bundle's `import '@openmsupply/plugin-sdk'` must resolve to the
 * HOST's instance. The mechanism is an import map pointing that specifier at a
 * shim module; the shim reads `globalThis.__oms__`, which is also the
 * last-resort resolver on an engine with no import-map support.
 *
 * Its own module, dynamically imported by the loader, for a measured reason:
 * the SDK's UI re-exports are only host startup weight if something eager
 * reaches them. Lazily, a deployment with no plugins pays nothing and one with
 * plugins pays a single ~0.6 KB gzip chunk of re-export bindings — the
 * components themselves stay in the chunks the host already ships.
 *
 * ⚠️ `solid-js` and its subpaths are deliberately NOT published here yet.
 * Doing so needs a module NAMESPACE import, which defeats tree-shaking on
 * solid and measured at ~4 KB gzip across the app's shared chunk — real weight
 * for a rendezvous nothing can use until the host also serves
 * import-map-addressable module URLs (kdd/bundling's open R2 spike (#770)). The solid
 * entries land with that spike, which is the change that makes them reachable.
 */
import * as sdk from './sdk';

export const publishHostModules = (): void => {
  globalThis.__oms__ = { '@openmsupply/plugin-sdk': sdk };
};
