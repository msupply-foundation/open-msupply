import type { GraphqlResult } from '@/api/graphql';
import type { DeleteCampaignsResult } from './campaigns.generated';

// Deleting a selection of campaigns (spec/campaigns rules.md § deleting a
// campaign, contract.md § deleting a campaign). Pure logic, no reactivity, so
// the two outcomes are pinned by tests without a backend.

/**
 * Did the selection delete? The delete is ATOMIC — one mutation, one server
 * transaction — so there are exactly two outcomes: the whole selection deleted,
 * or nothing was. The response union has no error member (every rejection is a
 * top-level error), so success of the fetch IS success of the delete.
 */
export const campaignsDeleted = (
  result: GraphqlResult<DeleteCampaignsResult>
): boolean => result.kind === 'success';

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
