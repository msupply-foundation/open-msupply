/*
 * A plugin built against a plugin API the host does not have
 * (spec/plugins/rules.md § compatibility gates). The loader must refuse it,
 * name it in diagnostics, and load every sibling anyway — so this bundle is
 * deliberately valid in every other respect. Installed alongside `hello_world`,
 * it is the V1 proof: this one absent and named, the other one rendering.
 */
import { definePlugin } from '@openmsupply/plugin-sdk';

export default definePlugin({
  manifest: {
    code: 'api_too_new',
    version: '1.0.0',
    // Deliberately far past anything the host will ever provide.
    pluginApiVersion: 999,
  },
  translations: {
    en: { label: 'This plugin should never render' },
  },
  contributions: [
    {
      slot: 'dashboard.stat',
      id: 'never',
      panel: 'replenishment.internal-order',
      Component: () => <p>api_too_new rendered — the version gate is broken</p>,
    },
  ],
});
