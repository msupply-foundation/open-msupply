import { stripEmpty } from '../../../typeHelpers';
import type { CustomFieldFilterState } from '../../../domain/customFields';
import type { NamesVariables, NamesResult } from '../names.generated';

// Pure list logic for the Customer & Supplier lists (spec/names). Kept
// framework-free so the AC-N* behaviour (store scope, role filter, type
// restriction, sort default, pagination, variables shape) is unit-testable in
// node without a DOM. The two lists are the SAME query differing only by the
// per-store relationship flag they filter on (rules › the entity and the two
// lists).

// The list is the customer view or the supplier view.
export type Role = 'customer' | 'supplier';

// The generated GraphQL shapes, used verbatim (kdd/type-safety: no remapping).
export type NamesFilter = NonNullable<NamesVariables['filter']>;
export type NamesSort = NamesVariables['sort'];
export type NameRow = NamesResult['names']['nodes'][number];
// Sortable keys are exactly the generated sort-field union — 'name' | 'code'
// (rules › sorting: no other column is sortable).
export type SortKey = NonNullable<NamesVariables['sort']>[number]['key'];

// Pagination (rules › pagination): default 20, options 10/20/50/100.
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// Role → the per-store relationship flag that selects that list. The server
// derives isCustomer/isSupplier from the name's relationship to the argument
// storeId, so filtering on one both scopes to the active store AND implies the
// name is visible (contract › store scoping).
export const roleRelationshipFilter = (role: Role): NamesFilter =>
  role === 'customer' ? { isCustomer: true } : { isSupplier: true };

// Client-applied type restriction: facility/store only (rules › which names
// qualify; AC-N4). INVAD/REPACK are excluded by omission; patients, system
// names, deleted names and disabled-store names are excluded server-side.
export const TYPE_RESTRICTION: NamesFilter = {
  type: { equalAny: ['FACILITY', 'STORE'] },
};

// URL-backed list state. `filter` holds only the user's search (codeOrName) in
// the generated operator shape; role + type restriction are applied at query
// time, not stored. `cf` holds the raw per-custom-field filter values,
// converted to the dynamicFilter AST at query time.
export type NamesListState = {
  filter: NamesFilter;
  // Typed per-custom-field filter values; null = an added-but-empty chip.
  cf?: CustomFieldFilterState;
  sort?: NamesSort;
  offset: number;
  first: number;
};

// Default: sorted name ascending (rules › sorting), first page of 20, no filter
// — the name/code search shows because its definition is a default filter
// (`alwaysOn`, listFilters.tsx), not because a key is seeded here.
export const DEFAULT_STATE: NamesListState = {
  filter: {},
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

// Compose the wire filter for a list: role relationship + type restriction +
// the live user search + the custom-field dynamicFilter AST. Role and
// type are ALWAYS applied and are never stripped (they are not removable user
// chips). stripEmpty drops an added-but-empty search chip so it doesn't perturb
// the query (see typeHelpers).
export const buildFilter = (
  role: Role,
  userFilter: NamesFilter,
  // The dynamicFilter AST. Codegen types the JSON scalar as `string`,
  // but the server's JSON scalar accepts the object directly in variables — so
  // the single cast to the generated field type lives here, at the one boundary
  // (documented codegen limitation; see BUILD_REPORT).
  dynamicFilter?: unknown
): NamesFilter => ({
  ...roleRelationshipFilter(role),
  ...TYPE_RESTRICTION,
  ...stripEmpty(userFilter),
  ...(dynamicFilter
    ? { dynamicFilter: dynamicFilter as unknown as string }
    : {}),
});

// The full query variables, derived straight from URL state + the store in the
// path (mirrors the reference vertical's variables memo).
export const buildVariables = (args: {
  storeId: string;
  role: Role;
  state: NamesListState;
  dynamicFilter?: unknown;
}): NamesVariables => ({
  storeId: args.storeId,
  filter: buildFilter(args.role, args.state.filter, args.dynamicFilter),
  sort: args.state.sort,
  page: { first: args.state.first, offset: args.state.offset },
});

// A listed name is itself a store when its `store` relation is present — drives
// the row's store indicator (rules › columns; AC-N8).
export const isStoreName = (row: Pick<NameRow, 'store'>): boolean =>
  row.store != null;

// Navigation targets (rules › row actions & navigation). Kept as pure builders
// so the row-open behaviour is unit-testable.
export const customersListPath = (storeId: string): string =>
  `/${storeId}/distribution/customers`;
export const suppliersListPath = (storeId: string): string =>
  `/${storeId}/replenishment/suppliers`;
// A supplier row navigates to its own detail page (AC-N15).
export const supplierDetailPath = (storeId: string, nameId: string): string =>
  `${suppliersListPath(storeId)}/${nameId}`;
// A purchase order opens in the purchase-order area (AC-N26).
export const purchaseOrderAreaPath = (storeId: string): string =>
  `/${storeId}/replenishment/purchase-order`;
