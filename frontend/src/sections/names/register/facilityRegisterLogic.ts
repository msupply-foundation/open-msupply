import { stripEmpty } from '@/typeHelpers';
import type {
  FacilitiesVariables,
  FacilitiesResult,
} from './facilityRegister.generated';

/*
 * Pure list logic for the FACILITY REGISTER — Manage › Stores (spec/names
 * slice 3, S5). Framework-free so the register's behaviours (membership,
 * store-independence, sort default, pagination, the save-and-move-on walk, and
 * the template's unpaginated read) are unit-testable in node without a DOM.
 *
 * Deliberately its OWN module rather than a `role` added to namesListLogic:
 * the register is not the same query with a third flag. It is not store-scoped,
 * it applies NO type restriction, it carries different columns, and it is the
 * vertical's only writing surface (rules § the entity and its three lists).
 */

// The generated GraphQL shapes, used verbatim (kdd/type-safety: no remapping).
export type FacilitiesFilter = NonNullable<FacilitiesVariables['filter']>;
export type FacilitiesSort = FacilitiesVariables['sort'];
export type FacilityRow = FacilitiesResult['names']['nodes'][number];
// Sortable keys are exactly the generated sort-field union — 'name' | 'code'.
// NameSortFieldInput has no member for any party-role flag, which is why the
// Supplier/Customer/Donor columns carry no sort (contract § sorting; .25).
export type FacilitySortKey = NonNullable<
  FacilitiesVariables['sort']
>[number]['key'];

// Pagination (rules § pagination): default 20, options 10/20/50/100.
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/*
 * The register's WHOLE membership test: `isStore: true` and nothing else — no
 * role flag, no `type`, no `isVisible` (contract § the entity and its three
 * lists). The server evaluates it against the name's own store row, not the
 * `storeId` argument, so the row set is independent of the active store and
 * includes the signed-in store's own name (.20). System names, deleted names
 * and names of disabled stores are excluded server-side (rules § which names
 * qualify; .22).
 */
export const REGISTER_FILTER: FacilitiesFilter = { isStore: true };

/** URL-backed list state. `filter` holds only the user's search. */
export type FacilityRegisterState = {
  filter: FacilitiesFilter;
  sort?: FacilitiesSort;
  offset: number;
  first: number;
};

/*
 * Default: sorted name ascending (.26), first page of 20. The name/code search
 * is the list's default filter and its only one (.27): seeded present-as-null
 * so its chip shows on a pristine list; stripEmpty drops it from the query
 * until the user types.
 */
export const DEFAULT_STATE: FacilityRegisterState = {
  filter: { codeOrName: null },
  sort: [{ key: 'name', desc: false }],
  offset: 0,
  first: DEFAULT_PAGE_SIZE,
};

/*
 * The wire filter: the membership test plus the live user search. `isStore` is
 * applied ALWAYS and is never stripped — it is not a removable user chip.
 */
export const buildRegisterFilter = (
  userFilter: FacilitiesFilter
): FacilitiesFilter => ({
  ...REGISTER_FILTER,
  ...stripEmpty(userFilter),
});

/**
 * The list's query variables, derived from URL state + the store in the path.
 */
export const buildRegisterVariables = (args: {
  storeId: string;
  state: FacilityRegisterState;
}): FacilitiesVariables => ({
  storeId: args.storeId,
  filter: buildRegisterFilter(args.state.filter),
  sort: args.state.sort,
  page: { first: args.state.first, offset: args.state.offset },
});

/*
 * The import template's row set is EVERY facility on the server, not the page
 * on screen (.12/.36), fetched in one deliberately unpaginated request —
 * captured as-is: a server with many facilities fetches them all at once, and
 * there is no chunking on the read (contract § importing facility properties).
 * The ceiling matches the settings vertical's equivalent whole-register read.
 */
export const TEMPLATE_PAGE_SIZE = 5000;

export const buildTemplateVariables = (
  storeId: string
): FacilitiesVariables => ({
  storeId,
  filter: REGISTER_FILTER,
  sort: [{ key: 'name', desc: false }],
  page: { first: TEMPLATE_PAGE_SIZE },
});

/*
 * Save-and-move-on (.31/.32): "next" is resolved entirely client-side from the
 * page of rows ALREADY LOADED for the current filter and sort — there is no
 * cursor and no extra request, which is why the walk stops at the end of the
 * loaded page rather than the end of the register. Undefined on the last row
 * (and for a row that is no longer in the list at all).
 */
export const nextFacility = (
  rows: readonly FacilityRow[],
  currentId: string | undefined
): FacilityRow | undefined => {
  if (currentId === undefined) return undefined;
  const index = rows.findIndex(row => row.id === currentId);
  return index >= 0 ? rows[index + 1] : undefined;
};

/*
 * The edited row's OWN store id — the store editor's Preferences tab subject
 * (spec/names § the facility editor). Separate from the signed-in store, which
 * is only the request's authorisation subject: from the register the two are
 * different stores, and confusing them writes the entered store's preferences
 * behind another facility's name. Resolved from the page already loaded, like
 * `nextFacility` — no cursor, no extra request.
 */
export const facilityStoreId = (
  rows: readonly FacilityRow[],
  currentId: string | undefined
): string | undefined =>
  currentId === undefined
    ? undefined
    : rows.find(row => row.id === currentId)?.store?.id;

/** The register's route (nav destination `manage/stores`). */
export const facilityRegisterPath = (storeId: string): string =>
  `/${storeId}/manage/stores`;
