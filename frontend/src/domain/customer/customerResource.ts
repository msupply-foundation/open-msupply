import { graphqlFetch } from '../../api/graphql';
import type { Page } from '../../ui/utils/createPaginatedSearch';
import { Customers, type CustomersResult } from './customer.generated';

export type Customer = Extract<
  CustomersResult['names'],
  { __typename: 'NameConnector' }
>['nodes'][number];

/*
 * One page of the store's customers, server-side filtered by code or name
 * (names.codeOrName) — the fetchPage half of createPaginatedSearch, mirroring
 * itemPageFetcher. The current app's customer search pages the same way
 * (useCustomersInfinite behind InfiniteSearchPicker); a load-all cap silently
 * truncates large customer lists and makes the searchable picker read as
 * authoritative when it isn't.
 */
export const customerPageFetcher =
  (storeId: string, pageSize: number) =>
  async (
    search: string,
    offset: number
  ): Promise<Page<Customer> | undefined> => {
    const result = await graphqlFetch(Customers, {
      storeId,
      filter: {
        isCustomer: true,
        ...(search ? { codeOrName: { like: search } } : {}),
      },
      // Sorted by name server-side — stable across pages so infinite scroll
      // doesn't reshuffle rows as new pages append.
      page: { first: pageSize, offset },
    });
    if (result.kind !== 'success') return undefined;
    const { names } = result.data;
    if (names.__typename !== 'NameConnector') return undefined;
    return { nodes: names.nodes, totalCount: names.totalCount };
  };
