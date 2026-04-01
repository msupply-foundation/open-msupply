import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, REQUISITION } from './keys';
import { useApi } from './useApi';

export const useRequisitionCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, REQUISITION, storeId],

    queryFn: () =>
      api.requisitionCounts({
        storeId,
      }),

    retry: false
  });

  if (!data?.requisitionCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = {
    count: data.requisitionCounts.response.new,
    emergency: data.requisitionCounts.emergency.new,
  };

  return { stats, ...rest };
};
