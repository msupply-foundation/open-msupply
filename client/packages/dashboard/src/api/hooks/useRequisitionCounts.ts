import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, REQUISITION } from './keys';
import { useApi } from './useApi';

export const useRequisitionCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, REQUISITION, storeId],
    () =>
      api.requisitionCounts({
        storeId,
      }),
    {
      retry: false,
    }
  );

  if (!data) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    count: data.requisitionCounts.response.new,
    emergency: data.requisitionCounts.emergency.new,
  };

  return { stats, ...rest };
};
