import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, INTERNAL_ORDER } from './keys';
import { useApi } from './useApi';

export const useInternalOrderCounts = () => {
  const { storeId, api } = useApi();

  const { data, ...rest } = useQuery(
    [DASHBOARD, INTERNAL_ORDER, storeId],
    () =>
      api.internalOrderCounts({
        storeId,
      }),
    {
      retry: false,
    }
  );

  if (!data) {
    return { stats: undefined, ...rest };
  }

  const stats = { count: data.requisitionCounts.request.draft };

  return { stats, ...rest };
};
