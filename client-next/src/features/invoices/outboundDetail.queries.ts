import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
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
