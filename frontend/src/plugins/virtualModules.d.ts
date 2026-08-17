/*
 * The dev-only virtual module vite/devPlugins.ts generates: a map from plugin
 * code to a lazy import of that plugin's ENTRY SOURCE (not a built bundle), so
 * a plugin under development joins the host's module graph — one Solid runtime,
 * the live in-tree SDK, HMR.
 *
 * Imported only by src/plugins/devPluginSources.ts, itself reached only through
 * the `import.meta.env.DEV` branch in src/plugins/loader.ts. In a production
 * build the specifier still resolves (Rollup resolves dynamic imports before
 * treeshaking removes the dead branch) — to an empty map that no chunk keeps.
 */
declare module 'virtual:oms-dev-plugins' {
  /**
   * code → evaluate that plugin's entry module. The key is the plugin code the
   * host registers it as: the manifest must agree, exactly as for an installed
   * bundle.
   */
  export const devPlugins: Readonly<Record<string, () => Promise<unknown>>>;
}
