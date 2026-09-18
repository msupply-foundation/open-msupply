import { graphqlFetch } from '../../api/graphql';
import type { Page } from '../../ui/utils/createPaginatedSearch';
import { SearchNames, type SearchNamesVariables } from './name.generated';

// The generated filter shape, used verbatim (kdd/type-safety: no remapping).
type NameFilter = NonNullable<SearchNamesVariables['filter']>;

// One name option: the fields the search selector shows/needs. The row shows
// "code name" plus an "(On hold)" suffix for a supplier on hold (not
// selectable). `isStore` distinguishes a supplier that is itself another store
// in the system (building icon; cost-price + foreign-currency locks) from a
// genuine external party (truck).
export type NameOption = {
  id: string;
  name: string;
  code: string;
  isSupplier: boolean;
  isDonor: boolean;
  isOnHold: boolean;
  isStore: boolean;
};

// Which role the picker narrows to — a customer / supplier / donor /
// manufacturer are all just `names` filtered by the corresponding
// NameFilterInput boolean flag (a "customer" is a name with isCustomer, not a
// separate entity), so one picker covers every party lookup.
export type NameRole = 'customer' | 'supplier' | 'donor' | 'manufacturer';

/**
 * Facility/store only — the party kinds a record can actually be created for.
 * The same client-applied restriction the customer & supplier lists send
 * (spec/names contract › which names qualify).
 *
 * ⚠️ Wire trap — it is load-bearing on the customer picker, not defensive.
 * `names` excludes patients in its base query, but `codeOrName` is an
 * OR-filter applied *before* that exclusion, so a patient whose NAME matches
 * the search escapes it (confirmed live: `isCustomer` + `codeOrName ~ "Maia"`
 * → 39 rows, every one a patient; the same search with this restriction → 0).
 * Patients carry a per-store `isCustomer` join, so without this they are
 * offered as customers and then rejected on create — the server's other-party
 * lookup excludes patients and reports the misleading
 * `OtherPartyDoesNotExist`. This restriction is applied after `codeOrName`, so
 * it is ANDed and keeps them out.
 */
const FACILITY_OR_STORE: NameFilter = {
  type: { equalAny: ['FACILITY', 'STORE'] },
};

/** The external half of that pair — a facility, never one of the system's own
 *  stores (see `NameNarrowing.external`). */
const FACILITY_ONLY: NameFilter = { type: { equalAny: ['FACILITY'] } };

export const roleFilter = (role: NameRole): NameFilter => {
  switch (role) {
    case 'customer':
      return { isCustomer: true, ...FACILITY_OR_STORE };
    case 'supplier':
      return { isSupplier: true };
    case 'donor':
      return { isDonor: true };
    case 'manufacturer':
      return { isManufacturer: true };
  }
};

/**
 * Fetch one page of names for the search selector: server-side filtered by
 * `search` (codeOrName), narrowed to the requested role + visible in the store.
 * Returns the page's rows + the grand total (so the caller knows when to stop
 * paging), or undefined on a failed fetch (graphqlFetch already surfaced it).
 *
 * A curried factory so the selector binds storeId + role once and hands
 * createPaginatedSearch a plain (search, offset) => Page fetcher — the same
 * shape ItemSearch uses (reusing the item module's paginated-search primitive).
 */
/**
 * One name node → the option shape, shared by the pager, the by-id fetch, and
 * any caller that already HOLDS the name because its own record fetched it —
 * a picker seeded from a record's stored party shouldn't need a second query
 * to learn its label. Structurally typed rather than tied to this query's
 * generated node, so any selection carrying these fields can use it.
 */
export const toNameOption = (node: {
  id: string;
  name: string;
  code: string;
  isSupplier: boolean;
  isDonor: boolean;
  isOnHold: boolean;
  store?: { id: string } | null;
}): NameOption => ({
  id: node.id,
  name: node.name,
  code: node.code,
  isSupplier: node.isSupplier,
  isDonor: node.isDonor,
  isOnHold: node.isOnHold,
  isStore: node.store != null,
});

/**
 * Resolve one name by id — the label restore for a picker reopened with only a
 * stored id (e.g. the report argument form re-opened from URL arguments,
 * spec/reports S3). Undefined when the id doesn't resolve (the picker just
 * shows empty).
 */
export const fetchNameById = async (
  storeId: string,
  id: string
): Promise<NameOption | undefined> => {
  const result = await graphqlFetch(SearchNames, {
    storeId,
    filter: { id: { equalTo: id } },
    page: { first: 1 },
  });
  if (result.kind !== 'success') return undefined;
  const node = result.data.names.nodes[0];
  return node ? toNameOption(node) : undefined;
};

/**
 * The narrowings a picker can lay over its role, each an AND on the same
 * `names` query. Named rather than positional, because two of them are
 * booleans that mean opposite things.
 */
export type NameNarrowing = {
  /**
   * Store-backed parties only (isStore) — a supplier/customer that is itself
   * another store in the system. The internal-order create picker needs it:
   * the create resolver rejects a non-store supplier, so offering only
   * store-backed ones keeps that rejection unreachable from the UI
   * (spec/internal-orders AC-C3).
   */
  storeBacked?: boolean;
  /**
   * External parties only — a FACILITY, never a STORE. The purchase-order
   * create picker needs it: an order goes to an external supplier, and the
   * other stores in the system are not offered (spec/purchase-orders § S2).
   * Narrows by `type` rather than `isStore: false`, matching the reference
   * app's own supplier search.
   */
  external?: boolean;
  /**
   * Withhold one party — the internal-order destination-customer picker
   * excludes the chosen supplier (spec/internal-orders › header fields).
   */
  excludeId?: string;
};

export const namePageFetcher =
  (
    storeId: string,
    role: NameRole,
    pageSize: number,
    narrowing: NameNarrowing = {}
  ) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<NameOption> | undefined> => {
    const result = await graphqlFetch(SearchNames, {
      storeId,
      filter: {
        ...roleFilter(role),
        isVisible: true,
        ...(narrowing.storeBacked ? { isStore: true } : {}),
        ...(narrowing.external ? FACILITY_ONLY : {}),
        ...(narrowing.excludeId
          ? { id: { notEqualTo: narrowing.excludeId } }
          : {}),
        ...(search ? { codeOrName: { like: search } } : {}),
      },
      // Sort by name ascending — stable across pages so infinite scroll doesn't
      // reshuffle rows as new pages append.
      sort: [{ key: 'name', desc: false }],
      page: { first: pageSize, offset },
    });
    if (result.kind !== 'success') return undefined;

    const { names } = result.data;
    return {
      nodes: names.nodes.map(toNameOption),
      totalCount: names.totalCount,
    };
  };
