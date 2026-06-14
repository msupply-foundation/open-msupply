import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './inboundDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const inboundSdk = getSdk(gqlClient);

export const inboundKeys = {
  detail: (storeId: string, id: string) =>
    ['invoices', storeId, 'inbound-detail', id] as const,
};

export const inboundShipmentQueryOptions = (storeId: string, invoiceId: string) =>
  queryOptions({
    queryKey: inboundKeys.detail(storeId, invoiceId),
    queryFn: async () => {
      const { invoice } = await inboundSdk.inboundShipment({ storeId, invoiceId });
      return invoice.__typename === 'InvoiceNode' ? invoice : null;
    },
  });
