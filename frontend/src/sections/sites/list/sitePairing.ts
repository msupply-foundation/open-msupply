import type { SiteRow } from './siteEdit';

// Pure logic behind the three pairing controls (spec/sites/rules.md § sync
// pairing state). Every condition below is enforced SERVER-side; the UI mirrors
// the two reachable ones so an affordance is never offered where it cannot work
// — which matters more here than anywhere else in the vertical, because none of
// the three mutations carries a typed error, so a rejection that does arrive
// has no branch to match and falls through to the generic unexpected-error
// handling (contract.md ⚠️ wire trap, ui-surface S3).

/** The server-configuration flag the multi-device switch is gated on. */
export const MULTI_DEVICE_FLAG = 'enable_multi_device_site';

/**
 * OMS-FUN-SYC-002.24 — the clear-hardware-id and clear-token controls are
 * offered only for a **current-flow (V7) site that is not the server's own**,
 * mirroring the server's `SiteIsNotV7` and `SameSite` refusals
 * (OMS-FUN-SYC-002.28, OMS-FUN-SYC-002.29). Every other site still opens and
 * still shows its hardware id and sync version, read-only.
 *
 * The server's own site comes from `syncSettings.syncSiteId`, which is null on
 * a server with no sync settings — then nothing is known to be "own", so only
 * the sync-version condition applies.
 */
export const showsPairingControls = (
  site: Pick<SiteRow, 'id' | 'syncVersion'>,
  ownSiteId: number | undefined
): boolean => site.syncVersion === 'V7' && site.id !== ownSiteId;

/**
 * Whether the server-configuration feature flag that must be set before
 * multi-device can be turned on is set. `featureFlags` is a `JSONObject`, i.e.
 * arbitrary JSON, so it arrives as `unknown` and is narrowed here — the one
 * boundary where this vertical inspects an untyped value, done with a type
 * predicate rather than a cast (kdd/type-safety).
 */
const isFlagMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const multiDeviceFlagEnabled = (featureFlags: unknown): boolean =>
  isFlagMap(featureFlags) && featureFlags[MULTI_DEVICE_FLAG] === true;

/**
 * The multi-device switch is inoperable in two cases:
 *  - OMS-FUN-SYC-002.30 — once ON it never goes back off. The UI's rule, not
 *  the
 *    server's (which accepts the flag in both directions): the changelog
 *    entries a second device skipped are not replayed on the way back.
 *  - OMS-FUN-SYC-002.31 — while the server-configuration flag is unset.
 */
export const multiDeviceDisabled = (
  isMultiDevice: boolean,
  flagEnabled: boolean
): boolean => isMultiDevice || !flagEnabled;

/**
 * OMS-FUN-SYC-002.31 — the flag is named as the reason, on the switch itself.
 * Suppressed once the switch is on, when the reason no longer applies
 * (ui-surface S2 § pairing actions).
 */
export const showsMultiDeviceReason = (
  isMultiDevice: boolean,
  flagEnabled: boolean
): boolean => !isMultiDevice && !flagEnabled;

/**
 * The hardware-id clear is additionally offered only while the site actually
 * HAS a hardware id — there is nothing to release otherwise (ui-surface S2
 * § pairing actions).
 */
export const showsClearHardwareId = (
  site: Pick<SiteRow, 'id' | 'syncVersion' | 'hardwareId'>,
  ownSiteId: number | undefined
): boolean =>
  showsPairingControls(site, ownSiteId) &&
  site.hardwareId !== null &&
  site.hardwareId !== '';
