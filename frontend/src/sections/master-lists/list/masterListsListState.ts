import type { MasterListsVariables } from '../masterLists.generated';

// URL-backed state for the master-lists list (spec/master-lists S1). The filter
// IS the generated MasterListFilterInput — there is no UI filter vocabulary to
// map onto it, so nothing is remapped (kdd/type-safety).

export type MasterListsFilter = NonNullable<MasterListsVariables['filter']>;

export type MasterListsListState = {
  filter: MasterListsFilter;
  sort?: MasterListsVariables['sort'];
  offset: number;
  first: number;
};

export const DEFAULT_PAGE_SIZE = 20;

// Default sort: name ascending (ui-surface S1 › Columns). The wire honours only
// the LAST sort entry (contract wire trap), so send a single one.
//
// `name: null` SEEDS the search chip: FilterBar shows a chip iff its key is
// present on the filter, and null is its "added but empty" marker — so the name
// search is there on arrival with no menu step. buildFilter drops a null, so
// the seed never perturbs the query.
export const DEFAULT_STATE: MasterListsListState = {
  filter: { name: null },
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// The user's chips + the store scoping the page always applies. Store scoping
// is a CLIENT filter, not the storeId argument (contract): storeId is
// auth/context only, so omitting existsForStoreId would return every active
// master list on the server.
export const buildFilter = (
  filter: MasterListsFilter,
  storeId: string
): MasterListsFilter => ({
  ...filter,
  // An added-but-empty chip is null; drop it rather than sending `name: null`.
  name: filter.name ?? undefined,
  existsForStoreId: { equalTo: storeId },
});
