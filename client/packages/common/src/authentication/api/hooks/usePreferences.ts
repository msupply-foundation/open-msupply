import { useAuthContext, useQuery } from '@openmsupply-client/common';
import { useAuthApi } from './useAuthApi';

export const usePreferences = () => {
  const { sdk, keys } = useAuthApi();
  const { storeId } = useAuthContext();

  return useQuery({
    queryKey: keys.preferences(),
    queryFn: async () => {
      const result = await sdk.preferences({ storeId });
      return result.preferences;
    },
  });
};
