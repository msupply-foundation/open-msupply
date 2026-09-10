import { stripEmpty } from '@/typeHelpers';
import { DEFAULT_PAGE_SIZE } from '@/list/pageSize';
import { CCE_CLASS_ID } from '../equipment';
import type { AssetsListVariables } from '../equipment.generated';

// The equipment list's URL-backed state and its mapping onto the GraphQL
// variables — extracted from the view so the class pinning, the destination's
// store restriction, sort and pagination (AC-S1, AC-S2, AC-L1, AC-L2) are
// testable in node vitest. Filter and sort are exactly the generated GraphQL
// shapes (kdd/type-safety: no remapping).

export type AssetFilter = NonNullable<AssetsListVariables['filter']>;

/**
 * The sort keys the list offers. The generated union carries seven, but only
 * three columns are sortable on screen (AC-L2) — the rest have no header
 * affordance. Exported so the view's columns and the test read one list.
 */
export type AssetSortKey = NonNullable<
  AssetsListVariables['sort']
>[number]['key'];

export const SORTABLE_KEYS: readonly AssetSortKey[] = [
  'assetNumber',
  'serialNumber',
  'installationDate',
] as const;

/**
 * The filter keys a user can set from the toolbar. `classId` is deliberately
 * NOT one of them — it is the register's own pinning, merged in at query time
 * so no chip can remove it (rules › what this register holds).
 *
 * `storeId` is not one either: it is the destination's restriction, decided by
 * which of the two screens is mounted, not by the user (rules › the two
 * destinations).
 */
export type AssetUserFilter = Omit<AssetFilter, 'classId' | 'storeId' | 'id'>;

/**
 * Which destination is mounted. The same screens serve both, and this is the
 * ONLY difference between them (rules › the two destinations):
 *
 * - `store` — **Cold chain › Equipment**: pinned to the active store.
 * - `all-stores` — **Manage › Equipment**: no store restriction at all.
 *
 * The server scopes neither, so the pinning here is the frontend's whole
 * obligation (contract ⚠️ wire trap).
 */
export type Destination = 'store' | 'all-stores';

export type EquipmentListState = {
  filter: AssetUserFilter;
  sort?: AssetsListVariables['sort'];
  offset: number;
  first: number;
};

/**
 * Default: installation date ascending (AC-L1) — the reference screen's own
 * default, which it sends explicitly. Absent a sort the server orders by id, a
 * UUID, so the default is never left to the server.
 *
 * The four filters the surface shows "always" are seeded PRESENT as `null` —
 * an added-but-empty chip, which `stripEmpty` keeps out of the query — so they
 * are on the bar from arrival with no menu step (ui-surface S1 § filters). The
 * other five are added from the filter menu.
 */
export const DEFAULT_STATE: EquipmentListState = {
  filter: {
    functionalStatus: null,
    categoryId: null,
    assetNumber: null,
    serialNumber: null,
  },
  sort: [{ key: 'installationDate', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/**
 * The interactive half of AC-L7: a type belongs to exactly one category, so
 * changing the CATEGORY always invalidates a chosen type.
 *
 * Decided from the two filters alone, with NO reference to the type list. The
 * loaded list describes the category being LEFT — it is keyed on the filter
 * that is only now changing — so asking it whether the new category contains
 * the chosen type always answers yes, and the contradiction survives.
 * {@link clearTypeOutsideCategory} covers the other half.
 */
export const clearTypeOnCategoryChange = (
  previous: AssetUserFilter,
  next: AssetUserFilter
): AssetUserFilter => {
  if (!next.typeId?.equalTo) return next;
  if (previous.categoryId?.equalTo === next.categoryId?.equalTo) return next;
  return { ...next, typeId: null };
};

/**
 * The arriving half of AC-L7: a URL that already carries a type from another
 * category never passes through {@link clearTypeOnCategoryChange}, so the
 * contradiction is caught once the category's own type list lands.
 *
 * An empty list while the catalogue is still loading MUST NOT clear the choice,
 * or a page load would silently drop a filter the URL carries.
 */
export const clearTypeOutsideCategory = (
  filter: AssetUserFilter,
  types: readonly { id: string }[]
): AssetUserFilter => {
  const typeId = filter.typeId?.equalTo;
  if (!typeId || types.length === 0) return filter;
  if (types.some(type => type.id === typeId)) return filter;
  return { ...filter, typeId: null };
};

/**
 * URL state + the destination → the query variables.
 *
 * - `classId` is merged in unconditionally: this register only ever lists
 *   cold-chain-equipment assets (AC-S1).
 * - `filter.storeId` is what makes Cold chain › Equipment the active store's
 *   register (AC-S2). The manage destination sends none, so it lists every
 *   store's equipment — captured as-is (AC-S6/AC-S7).
 * - `stripEmpty` drops added-but-empty filter chips so the query carries only
 *   live filters.
 * - `sort` is a single-element list: the server evaluates exactly one entry,
 *   and it is the LAST one, not the first its schema promises (contract ⚠️
 *   wire trap) — at one element the distinction cannot bite.
 */
export const buildListVariables = (
  state: EquipmentListState,
  storeId: string,
  destination: Destination
): AssetsListVariables => ({
  storeId,
  filter: {
    ...stripEmpty(state.filter),
    ...(destination === 'store' ? { storeId: { equalTo: storeId } } : {}),
    classId: { equalTo: CCE_CLASS_ID },
  },
  sort: state.sort,
  page: { first: state.first, offset: state.offset },
});
