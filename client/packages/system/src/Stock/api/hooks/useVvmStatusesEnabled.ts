import { useQuery } from 'react-query';
import { useStockGraphQL } from '../useStockGraphQL';
import { PreferenceKey, usePreference } from '@openmsupply-client/common';
import { VVM_STATUSES_CONFIGURED } from './keys';

export function useVvmStatusesEnabled() {
  const { stockApi, storeId } = useStockGraphQL();

  const { data: prefs } = usePreference(PreferenceKey.ManageVvmStatusForStock);

  const queryFn = async () => {
    const query = await stockApi.activeVvmStatuses({
      storeId,
    });
    return query?.activeVvmStatuses.nodes;
  };

  const { data, isLoading } = useQuery({
    queryKey: VVM_STATUSES_CONFIGURED,
    queryFn,
    refetchOnMount: true,
  });

  const result = !!prefs?.manageVvmStatusForStock ? data : undefined;

  return { data: result, isLoading };
}
