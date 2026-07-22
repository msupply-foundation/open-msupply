import { stripEmpty } from '../../../typeHelpers';
import type { LocationsListVariables } from './locations.generated';
import type { LocationFilter } from './listFilters';

// The list's URL-backed state and its mapping onto the GraphQL variables —
// extracted from the view so the store-scoping / sort / pagination wiring
// (AC-L1..AC-L4) is testable in node vitest. Filter and sort are exactly the
// generated GraphQL shapes (kdd/type-safety: no remapping).

export const DEFAULT_PAGE_SIZE = 20;

export type LocationsListState = {
  filter: LocationFilter;
  sort?: LocationsListVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: Name ascending (AC-L2). URL-backed, so a header click
// overrides it (and is shareable/restorable — AC-L3).
export const DEFAULT_STATE: LocationsListState = {
  filter: {},
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * URL state + the active store → the query variables. The list is store-scoped
 * by the query's own storeId argument (AC-L1); pagination is server-side
 * offset/first (AC-L4); stripEmpty drops added-but-empty filter chips (held as
 * null keys) so the query carries only live filters.
 */
export const buildListVariables = (
  state: LocationsListState,
  storeId: string
): LocationsListVariables => ({
  storeId,
  filter: stripEmpty(state.filter),
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});
