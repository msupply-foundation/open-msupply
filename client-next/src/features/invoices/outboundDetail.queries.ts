import { queryOptions } from '@tanstack/react-query';
import { StockLineSortFieldInput } from '@/gql/schema';
import { gqlClient } from '@/api/gqlClient';
import { stockSdk } from '@/features/stock/api';
import { getSdk } from './outboundDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const outboundSdk = getSdk(gqlClient);

export const outboundKeys = {
  detail: (storeId: string, id: string) =>
    ['invoices', storeId, 'outbound-detail', id] as const,
};

export const outboundShipmentQueryOptions = (
  storeId: string,
  invoiceId: string,
) =>
  queryOptions({
    queryKey: outboundKeys.detail(storeId, invoiceId),
    queryFn: async () => {
      const { invoice } = await outboundSdk.outboundShipment({
        storeId,
        invoiceId,
      });
      return invoice.__typename === 'InvoiceNode' ? invoice : null;
    },
  });

// Available stock lines (batches) for an item in the store, earliest-expiry
// first — the choices when adding an outbound line. Reuses the stock SDK.
export const availableStockLinesQueryOptions = (
  storeId: string,
  itemId: string,
) =>
  queryOptions({
    queryKey: ['stock', storeId, 'available', itemId] as const,
    queryFn: async () => {
      const res = await stockSdk.stockLines({
        storeId,
        first: 100,
        key: StockLineSortFieldInput.ExpiryDate,
        desc: false,
        filter: { itemId: { equalTo: itemId }, isAvailable: true },
      });
      return res.stockLines.__typename === 'StockLineConnector'
        ? res.stockLines.nodes
        : [];
    },
    staleTime: 30_000,
  });
