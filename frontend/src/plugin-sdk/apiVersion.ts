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

/*
 * Which host this is — the component runtime a plugin's contributions must be
 * written against. It names the number line PLUGIN_API_VERSION counts along:
 * `1` here and `1` in another host are unrelated facts, because a bundle
 * exporting Solid components cannot be rendered by a host that is not Solid,
 * whatever integer either of them declares.
 *
 * Sent at discovery and stamped into every bundle we pack, so a server can
 * match the two without knowing what either value means (spec/plugins/
 * contract.md § compatibility gates). It changes only if this app changes
 * component runtime — which would make it a different host, not a newer API —
 * so it is a separate constant rather than something a version bump encodes.
 */
export const HOST_RUNTIME = 'solid';
