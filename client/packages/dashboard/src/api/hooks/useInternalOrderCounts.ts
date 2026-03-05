import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INTERNAL_ORDER } from './keys';
import { useApi } from './useApi';

export const useInternalOrderCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, INTERNAL_ORDER, storeId],

    queryFn: () =>
      api.internalOrderCounts({
        storeId,
      }),

    retry: false
  });

  if (!data?.requisitionCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = { count: data.requisitionCounts.request.draft };

  return { stats, ...rest };
};
