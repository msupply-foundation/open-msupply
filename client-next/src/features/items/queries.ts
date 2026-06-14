import { queryOptions } from '@tanstack/react-query';
import type { ItemFilterInput } from '@/gql/schema';
import { itemsSdk } from './api';

// Item search for add-line pickers. Restricted to items visible or on-hand in
// the store; `codeOrName` is the same fuzzy filter the legacy picker uses.
export const itemSearchQueryOptions = (storeId: string, search: string) =>
  queryOptions({
    queryKey: ['items', 'search', storeId, search] as const,
    queryFn: async () => {
      const filter: ItemFilterInput = {
        isVisibleOrOnHand: true,
        ...(search ? { codeOrName: { like: search } } : {}),
      };
      const res = await itemsSdk.itemsSearch({ storeId, first: 50, filter });
      return res.items.__typename === 'ItemConnector' ? res.items.nodes : [];
    },
    staleTime: 60_000,
  });
