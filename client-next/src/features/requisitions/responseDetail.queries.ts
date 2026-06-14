import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './responseDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const responseSdk = getSdk(gqlClient);

export const responseKeys = {
  detail: (storeId: string, id: string) =>
    ['requisitions', storeId, 'response-detail', id] as const,
};

export const responseRequisitionQueryOptions = (
  storeId: string,
  requisitionId: string,
) =>
  queryOptions({
    queryKey: responseKeys.detail(storeId, requisitionId),
    queryFn: async () => {
      const { requisition } = await responseSdk.responseRequisition({
        storeId,
        requisitionId,
      });
      return requisition.__typename === 'RequisitionNode' ? requisition : null;
    },
  });
