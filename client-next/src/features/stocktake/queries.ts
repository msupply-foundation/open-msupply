import { queryOptions } from '@tanstack/react-query';
import { stocktakeSdk } from './api';

// Query keys rooted under storeId (store-scoped cache; see charter).
export const stocktakeKeys = {
  all: (storeId: string) => ['stocktake', storeId] as const,
  list: (storeId: string) => [...stocktakeKeys.all(storeId), 'list'] as const,
  detail: (storeId: string, id: string) =>
    [...stocktakeKeys.all(storeId), 'detail', id] as const,
  lines: (storeId: string, id: string) =>
    [...stocktakeKeys.all(storeId), 'lines', id] as const,
  // Inventory-adjustment reasons are global config, not store-scoped.
  reasonOptions: () => ['reasonOptions'] as const,
};

// Active inventory-adjustment reasons (rarely change — long staleTime).
export const reasonOptionsQueryOptions = () =>
  queryOptions({
    queryKey: stocktakeKeys.reasonOptions(),
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { reasonOptions } = await stocktakeSdk.reasonOptions();
      return reasonOptions.__typename === 'ReasonOptionConnector'
        ? reasonOptions.nodes
        : [];
    },
  });

export const stocktakesQueryOptions = (storeId: string) =>
  queryOptions({
    queryKey: stocktakeKeys.list(storeId),
    queryFn: async () => {
      const { stocktakes } = await stocktakeSdk.stocktakes({ storeId });
      return stocktakes.__typename === 'StocktakeConnector'
        ? stocktakes.nodes
        : [];
    },
  });

export const stocktakeQueryOptions = (storeId: string, id: string) =>
  queryOptions({
    queryKey: stocktakeKeys.detail(storeId, id),
    queryFn: async () => {
      const { stocktake } = await stocktakeSdk.stocktake({
        storeId,
        stocktakeId: id,
      });
      return stocktake.__typename === 'StocktakeNode' ? stocktake : null;
    },
  });

// Pulls every line in one request — deliberately, to stress the grid (~5,000 rows).
export const stocktakeLinesQueryOptions = (storeId: string, id: string) =>
  queryOptions({
    queryKey: stocktakeKeys.lines(storeId, id),
    queryFn: async () => {
      const { stocktakeLines } = await stocktakeSdk.stocktakeLines({
        storeId,
        stocktakeId: id,
        first: 100000,
      });
      return stocktakeLines.__typename === 'StocktakeLineConnector'
        ? stocktakeLines.nodes
        : [];
    },
  });
