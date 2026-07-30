import { FRONTEND_PLUGINS_URL } from '../config';

/**
 * Where a discovered plugin's bundle is fetched from
 * (spec/plugins/contract.md § caching & updates).
 *
 * `path` and `hash` come straight from discovery: `path` is the server's
 * `{code}/{entry}` and `hash` is its content hash. The hash rides as `?v=` —
 * the ONLY cache-invalidation mechanism, because the server serves plugin
 * bundles `immutable` (a file name never changes when the bytes do). Same bytes
 * ⇒ same URL ⇒ cache hit; new bytes ⇒ new hash ⇒ new URL ⇒ refetch
 * (AC-PLUG-C1/C2).
 *
 * Deliberately origin-absolute, not `BASE_URL`-prefixed: the server mounts
 * `/frontend_plugins` at its own root regardless of where the app bundle is
 * mounted (the dev/preview proxies forward the same path).
 */
export const pluginBundleUrl = (path: string, hash: string): string =>
  `${FRONTEND_PLUGINS_URL}/${path}?v=${hash}`;
