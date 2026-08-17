// The deployment-gate table from spec/sites/rules.md § where sites are managed,
// as one pure function — because it IS a table in the spec, and because the whole
// area's shape turns on it: two INDEPENDENT gates, not one, and they are not both
// about writing.
//
//   deployment                          register read   identity + stores   pairing
//   ---------------------------------------------------------------------------------
//   remote site (not central)           refused         refused             refused
//   central with a legacy central above  available       refused             AVAILABLE
//   standalone central                  available       available           available
//
// The first gate — "is this a central server at all" — is not answered here: it
// is answered before the screen exists, by the `centralAdmin` capability gate on
// the destination (src/nav/navConfig.ts + navGates.ts), and by the whole
// `centralServer` namespace refusing the read if the screen is reached anyway.
// What this function answers is everything downstream of it.

export type SiteAffordances = {
  /** The register's create action, and the modal opening in create mode. */
  create: boolean;
  /** The register's leading selection column — and so its bulk-action footer. */
  selection: boolean;
  /** The editor's identity inputs accept input (rather than render disabled). */
  identityEditable: boolean;
  /** The editor's write-only password row exists at all. */
  password: boolean;
  /** The editor's store lookup exists at all. */
  storePicker: boolean;
  /** The per-store remove affordance exists (whether it is also disabled is a
   *  separate question — the central server's own site cannot give stores back
   *  to anything, see siteEdit.storeRemovalAllowed). */
  storeRemove: boolean;
  /** The editor's Save. */
  save: boolean;
  /** The editor's Delete. */
  delete: boolean;
  /** The two clears and the multi-device switch. */
  pairing: boolean;
};

export type SiteGateInputs = {
  /** `Query.isCentralStandalone` — false until known, the safe direction. */
  isStandalone: boolean;
  /** An existing site is open (not a create): sync has written state to show. */
  isExistingSite: boolean;
  /**
   * The site meets both pairing conditions — a current-flow site that is not this
   * server's own (sitePairing.showsPairingControls).
   */
  pairingAvailable: boolean;
};

/**
 * OMS-FUN-SYC-002.12 / .13 / .15 — what the area offers on this deployment.
 *
 * On a mixed central the identity and store half is refused because the register
 * is authored by the legacy central ABOVE and pushed down, so editing here would
 * be overwritten; the pairing half is this server's own state and stays
 * available. That asymmetry is the whole point of the table.
 */
export const siteAffordances = (inputs: SiteGateInputs): SiteAffordances => ({
  create: inputs.isStandalone,
  selection: inputs.isStandalone,
  identityEditable: inputs.isStandalone,
  password: inputs.isStandalone,
  storePicker: inputs.isStandalone,
  storeRemove: inputs.isStandalone,
  save: inputs.isStandalone,
  // Existing sites only: a create has nothing to delete yet.
  delete: inputs.isStandalone && inputs.isExistingSite,
  // NOT gated on standalone — the exception the spec calls out.
  pairing: inputs.isExistingSite && inputs.pairingAvailable,
});
