import { useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const usePreferences = () => {
  const { api, storeId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: ['preferences'],
    queryFn: async () => {
      const { preferences } = await api.preferences({ storeId });
      return preferences;
    },
  });
};
