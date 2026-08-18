// Deleting a selection of campaigns (spec/campaigns rules.md § deleting a
// campaign, contract.md § deleting a campaign). Pure logic, no reactivity, so
// the pruning a refusal triggers is pinned by tests without a backend. The
// delete's own two outcomes are the fetch result's kind, checked inline in
// DeleteCampaignsAction.

/**
 * The selection that survives a refused delete. A refusal deleted nothing, and
 * its only domain rejection is a selected campaign no longer in the register —
 * the register moved underneath the selection. The caller re-reads the register
 * and drops the vanished ids from the kept selection, so the selection count
 * never includes rows that are no longer on screen.
 */
export const survivingSelection = (
  selected: readonly string[],
  register: readonly { id: string }[]
): string[] => {
  const present = new Set(register.map(row => row.id));
  return selected.filter(id => present.has(id));
};
