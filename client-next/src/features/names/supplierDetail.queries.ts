import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './supplierDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const supplierDetailSdk = getSdk(gqlClient);

export const supplierKeys = {
  detail: (storeId: string, id: string) =>
    ['names', storeId, 'supplier-detail', id] as const,
  purchaseOrders: (storeId: string, id: string) =>
    ['names', storeId, 'supplier-detail', id, 'purchase-orders'] as const,
  contacts: (storeId: string, id: string) =>
    ['names', storeId, 'supplier-detail', id, 'contacts'] as const,
};

export const supplierByIdQueryOptions = (storeId: string, nameId: string) =>
  queryOptions({
    queryKey: supplierKeys.detail(storeId, nameId),
    queryFn: async () => {
      const { names } = await supplierDetailSdk.supplierById({
        storeId,
        nameId,
      });
      return names.__typename === 'NameConnector'
        ? (names.nodes[0] ?? null)
        : null;
    },
  });

export const supplierPurchaseOrdersQueryOptions = (
  storeId: string,
  nameId: string,
  supplierName: string,
) =>
  queryOptions({
    queryKey: supplierKeys.purchaseOrders(storeId, nameId),
    queryFn: async () => {
      const { purchaseOrders } = await supplierDetailSdk.supplierPurchaseOrders({
        storeId,
        supplierName,
      });
      return purchaseOrders.__typename === 'PurchaseOrderConnector'
        ? purchaseOrders.nodes
        : [];
    },
  });

export const supplierContactsQueryOptions = (storeId: string, nameId: string) =>
  queryOptions({
    queryKey: supplierKeys.contacts(storeId, nameId),
    queryFn: async () => {
      const { contacts } = await supplierDetailSdk.supplierContacts({
        storeId,
        nameId,
      });
      return contacts.__typename === 'ContactConnector' ? contacts.nodes : [];
    },
  });
