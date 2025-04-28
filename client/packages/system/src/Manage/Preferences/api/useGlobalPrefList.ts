import { PreferenceNodeType, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';

export const useGlobalPrefList = () => {
  const { api, storeId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: 'preference-descriptions',
    queryFn: async () => {
      const result = await api.preferenceDescriptions({
        storeId,
        prefType: PreferenceNodeType.Global,
      });

      return result.preferenceDescriptions;
    },
  });
};
