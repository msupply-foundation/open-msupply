import { FRONTEND_PLUGINS_URL } from '../config';

/**
 * Where a discovered plugin's bundle is fetched from
 * (spec/plugins/contract.md § caching & updates).
 *
 * `path` and `hash` come straight from discovery and are used verbatim: `path`
 * is the server's `{plugin row id}/{entry}` — keyed on the row rather than the
 * code, since a server holds a bundle of one code per host and their entry
 * files commonly share a name — and `hash` is its content hash. Never assemble
 * that path here: which bundle a code resolves to is the server's answer to
 * who asked (spec/plugins/contract.md § discovery & loading).
 *
 * The hash rides as `?v=` — the ONLY cache-invalidation mechanism, because the
 * server serves plugin bundles `immutable` (a file name never changes when the
 * bytes do). Same bytes ⇒ same URL ⇒ cache hit; new bytes ⇒ new hash ⇒ new URL
 * ⇒ refetch (AC-PLUG-C1/C2).
 *
 * Deliberately origin-absolute, not `BASE_URL`-prefixed: the server mounts
 * `/frontend_plugins` at its own root regardless of where the app bundle is
 * mounted (the dev/preview proxies forward the same path).
 */
export const pluginBundleUrl = (path: string, hash: string): string =>
  `${FRONTEND_PLUGINS_URL}/${path}?v=${hash}`;
