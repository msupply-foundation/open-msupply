import type {
  CampaignsResult,
  CampaignsVariables,
} from './campaigns.generated';

// The register's read state and the variables it maps onto
// (spec/campaigns rules.md § listing campaigns, contract.md § listing
// campaigns). Pure — no reactivity — so the wire traps the register has to
// steer around are pinned by tests rather than by reading the screen.

/** One register row — the generated node, never remapped (kdd/type-safety). */
export type Campaign = CampaignsResult['campaigns']['nodes'][number];

/**
 * The register's sort key type. `CampaignSortFieldInput` carries exactly one
 * value, so this is the literal `'name'`: a column can only ever name a real
 * sort key, and the absence of `startDate`/`endDate` keys is what makes the two
 * date columns unsortable (contract.md § backend gaps).
 */
export type CampaignSortKey = NonNullable<
  CampaignsVariables['sort']
>[number]['key'];

/**
 * URL-backed register state (spec/ui-standards conventions § urls). Sort and
 * page are exactly the generated GraphQL shapes; there is no `filter` member
 * because the register offers none.
 */
export type CampaignRegisterState = {
  sort: NonNullable<CampaignsVariables['sort']>;
  offset: number;
  first: number;
};

/** Default page size for the register (ui-surface S1 § Layout). */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Default order is by name, ascending — the only sort the register has
 * (rules.md § listing campaigns). It has to be SENT: with no `sort` the server
 * falls back to `id` ascending, so there is no server-side default that matches
 * the rule (contract.md wire trap).
 */
export const DEFAULT_REGISTER_STATE: CampaignRegisterState = {
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * The read's variables. `storeId` AUTHORISES only — the register is
 * installation-wide and the argument scopes nothing (contract.md wire trap), so
 * nothing here treats it as a filter.
 *
 * The sort list is truncated to its FIRST entry: the resolver pops the list and
 * applies the LAST one, so sending more than one entry silently sorts by
 * whichever ended up last. Exactly one entry always travels.
 */
export const campaignVariables = (
  storeId: string,
  state: CampaignRegisterState
): CampaignsVariables => ({
  storeId,
  sort: [state.sort[0] ?? DEFAULT_REGISTER_STATE.sort[0]],
  page: { first: state.first, offset: state.offset },
});
