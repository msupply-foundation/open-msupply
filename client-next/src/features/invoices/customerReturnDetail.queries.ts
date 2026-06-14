import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './customerReturnDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const customerReturnSdk = getSdk(gqlClient);

export const customerReturnKeys = {
  detail: (storeId: string, id: string) =>
    ['invoices', storeId, 'customer-return-detail', id] as const,
};

export const customerReturnQueryOptions = (storeId: string, invoiceId: string) =>
  queryOptions({
    queryKey: customerReturnKeys.detail(storeId, invoiceId),
    queryFn: async () => {
      const { invoice } = await customerReturnSdk.customerReturn({
        storeId,
        invoiceId,
      });
      return invoice.__typename === 'InvoiceNode' ? invoice : null;
    },
  });
