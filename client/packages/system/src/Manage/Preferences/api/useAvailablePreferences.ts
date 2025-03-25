import { useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useAvailablePreferences = () => {
  const { api } = usePreferencesGraphQL();

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const result = await api.AllPrefs();

      return result.availablePreferences;
    },
  });

  return { query: { data, isLoading } };
};
