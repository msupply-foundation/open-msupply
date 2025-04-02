import { useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useAvailablePreferences = () => {
  const { api, storeId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: 'availablePreferences',
    queryFn: async () => {
      const result = await api.availablePreferences({ storeId });

      return result.availablePreferences;
    },
  });
};
