import type { GraphqlResult } from '@/api/graphql';
import type { DeleteCampaignResult } from './campaigns.generated';

// Deleting a selection of campaigns (spec/campaigns rules.md § deleting a
// campaign, contract.md § deleting a campaign). Pure logic, no reactivity: the
// runner takes the per-campaign delete as a callback so the partial-success
// shape can be tested without a backend.

/** Did one delete succeed? */
export const campaignDeleted = (
  result: GraphqlResult<DeleteCampaignResult>
): boolean =>
  result.kind === 'success' &&
  result.data.centralServer.campaign.deleteCampaign.__typename ===
    'DeleteCampaignSuccess';

/**
 * What a selection delete did. Partial success is the CONTRACT, not an
 * exception: there is no bulk operation, so a selection is n independent
 * deletes with no surrounding transaction — each one that succeeds stays
 * deleted even if a later one is rejected.
 */
export type CampaignDeleteReport = {
  /** Ids the server confirmed deleted. */
  deleted: string[];
  /** Ids it refused (or that failed) — each stays in the register. */
  failed: string[];
};

/**
 * Delete each selected campaign independently, in order, and report both sides.
 *
 * Sequential rather than concurrent: n unbatched writes against the central
 * server are the mechanism the missing bulk operation forces, and issuing them
 * one at a time keeps the register's own refetch (which follows) reading a
 * settled state rather than racing a fan-out.
 *
 * There is no in-use guard to anticipate — a campaign tagged on stock or on
 * documents deletes just the same — so nothing is pre-checked here; every id is
 * submitted and the server decides (ui-standards validation.md § actions).
 */
export const runCampaignDeletes = async (
  ids: readonly string[],
  deleteOne: (id: string) => Promise<boolean>
): Promise<CampaignDeleteReport> => {
  const report: CampaignDeleteReport = { deleted: [], failed: [] };
  for (const id of ids) {
    if (await deleteOne(id)) report.deleted.push(id);
    else report.failed.push(id);
  }
  return report;
};
