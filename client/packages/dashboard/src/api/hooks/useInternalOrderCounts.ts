import { useQuery } from '@openmsupply-client/common';
import { DASHBOARD, REQUISITION } from './keys';
import { useApi } from './useApi';

export const useInternalOrderCounts = () => {
  const { storeId, api } = useApi();

  // Uses the same query key as useRequisitionCounts so both hooks share one
  // HTTP request via react-query deduplication. The combined operation fetches
  // all requisition count fields; each hook selects only what it needs.
  const { data, ...rest } = useQuery({
    queryKey: [DASHBOARD, REQUISITION, storeId],
    queryFn: () => api.dashboardRequisitionCounts({ storeId }),
    enabled: !!storeId,
    retry: false,
  });

  if (!data?.requisitionCounts) {
    return { stats: undefined, ...rest };
  }

  const stats = { count: data.requisitionCounts.request.draft };

  return { stats, ...rest };
};
