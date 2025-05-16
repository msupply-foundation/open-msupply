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
    return query?.activeVvmStatuses;
  };

  const query = useQuery({ queryKey, queryFn });
  const result = !!prefs?.manageVvmStatusForStock
    ? query.data?.nodes
    : undefined;

  return result;
}
