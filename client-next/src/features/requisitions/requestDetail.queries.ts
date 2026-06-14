import { queryOptions } from '@tanstack/react-query';
import { gqlClient } from '@/api/gqlClient';
import { getSdk } from './requestDetail.generated';

// Each detail file owns its SDK (the near-operation-file codegen emits one
// getSdk per .graphql document).
export const requestSdk = getSdk(gqlClient);

export const requestKeys = {
  detail: (storeId: string, id: string) =>
    ['requisitions', storeId, 'request-detail', id] as const,
};

export const requestRequisitionQueryOptions = (
  storeId: string,
  requisitionId: string,
) =>
  queryOptions({
    queryKey: requestKeys.detail(storeId, requisitionId),
    queryFn: async () => {
      const { requisition } = await requestSdk.requestRequisition({
        storeId,
        requisitionId,
      });
      return requisition.__typename === 'RequisitionNode' ? requisition : null;
    },
  });
