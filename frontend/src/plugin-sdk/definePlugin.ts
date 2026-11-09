import type { PluginDefinition, PluginModule } from './types';

/**
 * Declare a plugin — the bundle's default export (spec/plugins/sdk-contract.md
 * § entry contract).
 *
 * Pure: it validates nothing and registers nothing (the loader does both, so a
 * malformed bundle is refused by the host rather than by code inside it). It
 * only brands the definition — `kind: 'oms.plugin'` is what the loader checks —
 * and freezes it, so a later-loaded plugin cannot mutate an earlier one's
 * registration. The freeze is shallow: the arrays a plugin passes are its own
 * literals, and deep-freezing every contribution would cost startup time for no
 * additional guarantee.
 */
export const definePlugin = (definition: PluginDefinition): PluginModule =>
  Object.freeze({ ...definition, kind: 'oms.plugin' as const });
