/*
 * The plugin API version pair (spec/plugins/rules.md § compatibility).
 *
 * PLUGIN_API_VERSION is the host's current API; a plugin declaring a newer
 * one is refused by the loader. PLUGIN_API_MIN_SUPPORTED is the floor: a
 * plugin declaring an older one is refused; anything in between loads (with
 * a downlevel diagnostic when below current). Two constants — not semver —
 * so the gate is a pair of integer comparisons.
 */
export const PLUGIN_API_VERSION = 1;
export const PLUGIN_API_MIN_SUPPORTED = 1;
