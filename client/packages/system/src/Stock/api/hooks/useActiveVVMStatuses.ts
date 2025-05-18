import { useQuery } from 'react-query';
import { useStockGraphQL } from '../useStockGraphQL';
import { PreferenceKey, usePreference } from 'packages/common/src';

export function useActiveVVMStatuses() {
  const { stockApi, storeId } = useStockGraphQL();

  const { data: prefs } = usePreference(PreferenceKey.ManageVvmStatusForStock);

  const queryKey = 'VVM_STATUSES_CONFIGURED';
  const queryFn = async () => {
    const query = await stockApi.activeVvmStatuses({
      storeId,
    });
    return query?.activeVvmStatuses.nodes;
  };

  const { data, isLoading } = useQuery({ queryKey, queryFn });
  const result = !!prefs?.manageVvmStatusForStock ? data : undefined;
  return { data: result, isLoading };
}
