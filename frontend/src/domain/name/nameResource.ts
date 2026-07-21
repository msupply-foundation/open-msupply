import { graphqlFetch } from '../../api/graphql';
import type { Page } from '../../ui/utils/createPaginatedSearch';
import { SearchNames, type SearchNamesResult } from './name.generated';

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

type NameNode = Extract<
  SearchNamesResult['names'],
  { __typename: 'NameConnector' }
>['nodes'][number];

// Which role the picker narrows to — a customer / supplier / donor /
// manufacturer are all just `names` filtered by the corresponding
// NameFilterInput boolean flag (a "customer" is a name with isCustomer, not a
// separate entity), so one picker covers every party lookup.
export type NameRole = 'customer' | 'supplier' | 'donor' | 'manufacturer';

const roleFilter = (role: NameRole) => {
  switch (role) {
    case 'customer':
      return { isCustomer: true };
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
// One name node → the option shape (shared by the pager and the by-id fetch).
const toOption = (node: NameNode): NameOption => ({
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
  return node ? toOption(node) : undefined;
};

export const namePageFetcher =
  (storeId: string, role: NameRole, pageSize: number) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<NameOption> | undefined> => {
    const result = await graphqlFetch(SearchNames, {
      storeId,
      filter: {
        ...roleFilter(role),
        isVisible: true,
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
      nodes: names.nodes.map(toOption),
      totalCount: names.totalCount,
    };
  };
