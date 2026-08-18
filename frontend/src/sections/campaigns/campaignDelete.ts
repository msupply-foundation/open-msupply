// Deleting a selection of campaigns (spec/campaigns rules.md § deleting a
// campaign, contract.md § deleting a campaign). Pure logic, no reactivity, so
// the pruning a refusal triggers is pinned by tests without a backend. The
// delete's own outcomes are the fetch result's kind, checked inline in
// DeleteCampaignsAction.

import type { CampaignsVariables } from './campaigns.generated';
import { DEFAULT_REGISTER_STATE } from './campaignRegister';

/**
 * The read the prune checks the kept selection against: the WHOLE register —
 * no page (the sanctioned generous read, the same shape the pickers use) —
 * because a selection can span pages, so the visible page cannot answer which
 * selected rows survive. The register read discipline still holds: exactly one
 * sort entry travels (contract.md wire trap).
 */
export const wholeRegisterVariables = (
  storeId: string
): CampaignsVariables => ({
  storeId,
  sort: DEFAULT_REGISTER_STATE.sort,
});

/**
 * The selection that survives a refused delete. A refusal deleted nothing, and
 * its only domain rejection is a selected campaign no longer in the register —
 * the register moved underneath the selection. When the could-not-delete
 * notice is dismissed, the caller reads the whole register and drops the
 * vanished ids from the kept selection, so the selection count never includes
 * rows that are gone.
 */
export const survivingSelection = (
  selected: readonly string[],
  register: readonly { id: string }[]
): string[] => {
  const present = new Set(register.map(row => row.id));
  return selected.filter(id => present.has(id));
};
