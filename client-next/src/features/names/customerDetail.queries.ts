import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './customerDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const customerDetailSdk = getSdk(gqlClient);

export const customerDetailKeys = {
  detail: (storeId: string, id: string) =>
    ['names', storeId, 'customer-detail', id] as const,
};

export const customerByIdQueryOptions = (storeId: string, nameId: string) =>
  queryOptions({
    queryKey: customerDetailKeys.detail(storeId, nameId),
    queryFn: async () => {
      const { names } = await customerDetailSdk.customerById({ storeId, nameId });
      return names.__typename === 'NameConnector'
        ? (names.nodes[0] ?? null)
        : null;
    },
  });
