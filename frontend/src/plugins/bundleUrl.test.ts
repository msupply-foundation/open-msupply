import { describe, expect, it } from 'vitest';
import { pluginBundleUrl } from './bundleUrl';

describe('pluginBundleUrl', () => {
  it('serves the discovered path under the plugin route, hash as ?v=', () => {
    expect(pluginBundleUrl('civ_plugins/civ_plugins.js', 'abc123')).toBe(
      '/frontend_plugins/civ_plugins/civ_plugins.js?v=abc123'
    );
  });

  it('changes only when the hash changes (AC-PLUG-C1/C2)', () => {
    const path = 'hello_world/hello_world.js';
    // Same bytes, same URL — an immutable-cache hit, no refetch.
    expect(pluginBundleUrl(path, 'aaa')).toBe(pluginBundleUrl(path, 'aaa'));
    // New bytes, new hash, new URL — the ONLY invalidation mechanism, because
    // the file name never changes when the bytes do.
    expect(pluginBundleUrl(path, 'aaa')).not.toBe(pluginBundleUrl(path, 'bbb'));
  });
});
