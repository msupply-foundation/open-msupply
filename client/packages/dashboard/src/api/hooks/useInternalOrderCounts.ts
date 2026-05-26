import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, REQUISITION } from './keys';
import { useApi } from './useApi';

export const useInternalOrderCounts = () => {
  const { storeId, api } = useApi();

  // Uses the same query key as useRequisitionCounts so both hooks deduplicate
  // to one HTTP request. The combined operation fetches all requisition count fields.
  const { data, ...rest } = useQuery(
    [DASHBOARD, REQUISITION, storeId],
    () =>
      api.dashboardRequisitionCounts({
        storeId,
      }),
    {
      enabled: !!storeId,
      retry: false,
    }
  );

  if (!data?.requisitionCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = { count: data.requisitionCounts.request.draft };

  return { stats, ...rest };
};
