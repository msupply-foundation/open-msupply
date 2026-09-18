import { stripEmpty } from '@/typeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import type { LocationsListVariables } from './locations.generated';
import type { LocationFilter } from './listFilters';

// The list's URL-backed state and its mapping onto the GraphQL variables —
// extracted from the view so the store-scoping / sort / pagination wiring
// (OMS-REG-INV-01.36..OMS-REG-INV-01.19) is testable in node vitest. Filter
// and sort are exactly the generated GraphQL shapes (kdd/type-safety: no
// remapping).

export type LocationsListState = {
  filter: LocationFilter;
  sort?: LocationsListVariables['sort'];
  offset: number;
  first: number;
};

// Default sort: Name ascending (OMS-REG-INV-01.17). URL-backed, so a header
// click overrides it (and is shareable/restorable — OMS-REG-INV-01.14).
export const DEFAULT_STATE: LocationsListState = {
  filter: {},
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * URL state + the active store → the query variables. The list is store-scoped
 * by the query's own storeId argument (OMS-REG-INV-01.36); pagination is
 * server-side offset/first (OMS-REG-INV-01.19); stripEmpty drops
 * added-but-empty filter chips (held as null keys) so the query carries only
 * live filters.
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
