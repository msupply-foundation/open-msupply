import { useQuery } from 'react-query';
import { usePreference, PreferenceKey } from '@openmsupply-client/common';
import { useStockGraphQL } from '../useStockGraphQL';

// VVM Status inputs (e.g. in Inbound Shipment) should not be available if no vvm statuses are configured
export const useIsVVMStatusEnabled = () => {
  const { stockApi, storeId } = useStockGraphQL();

  const { data: prefs } = usePreference(PreferenceKey.ManageVvmStatusForStock);

  // check statuses exist
  const { data: vvmStatuses } = useQuery({
    queryFn: async () => {
      const result = await stockApi.vvmStatusesConfigured({
        storeId,
      });

      return result.vvmStatusesConfigured;
    },

    // Only call on page load
    refetchOnMount: false,
  });

  return !!prefs?.manageVvmStatusForStock && !!vvmStatuses;
};
