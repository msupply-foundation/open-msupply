/*
 * @openmsupply/plugin-sdk — the host surface plugins compile against and
 * resolve at runtime through the import map (kdd/plugin-loading,
 * spec/plugins/sdk-contract.md).
 *
 * This is the sanctioned curated barrel: everything exported here is public
 * API for out-of-tree plugins, shared as ONE live instance via the
 * shared-module facade (src/plugin-runtime/shared/sdk.ts). Keep the eager
 * surface lean — every addition is startup weight for plugin-bearing
 * deployments and a per-PR bundle-size event (kdd/bundling).
 *
 * MUST stay free of module-scope side effects: this module is evaluated by
 * the facade entry before any plugin code runs.
 */
export { PLUGIN_API_VERSION, PLUGIN_API_MIN_SUPPORTED } from './apiVersion';
