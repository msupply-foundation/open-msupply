import { useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useAvailablePreferences = () => {
  const { api } = usePreferencesGraphQL();

  return useQuery({
    queryKey: 'availablePreferences',
    queryFn: async () => {
      const result = await api.allPrefs();

      return result.availablePreferences;
    },
  });
};
