import { useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const usePreferenceDescriptions = () => {
  const { api, storeId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: 'preference-descriptions',
    queryFn: async () => {
      const result = await api.preferenceDescriptions({ storeId });

      return result.preferenceDescriptions;
    },
  });
};
