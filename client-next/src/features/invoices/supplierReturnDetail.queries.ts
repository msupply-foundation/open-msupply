import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './supplierReturnDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const supplierReturnSdk = getSdk(gqlClient);

export const supplierReturnKeys = {
  detail: (storeId: string, id: string) =>
    ['invoices', storeId, 'supplier-return-detail', id] as const,
};

export const supplierReturnQueryOptions = (storeId: string, invoiceId: string) =>
  queryOptions({
    queryKey: supplierReturnKeys.detail(storeId, invoiceId),
    queryFn: async () => {
      const { invoice } = await supplierReturnSdk.supplierReturn({
        storeId,
        invoiceId,
      });
      return invoice.__typename === 'InvoiceNode' ? invoice : null;
    },
  });
