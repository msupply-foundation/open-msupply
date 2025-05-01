import { PreferenceNodeType, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCE_DESCRIPTIONS } from './keys';

export const useAdminPrefsList = (prefType: PreferenceNodeType) => {
  const { api, storeId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: [PREFERENCE_DESCRIPTIONS, prefType],
    queryFn: async () => {
      const result = await api.adminPreferenceList({
        storeId,
        prefType,
      });

      return result.preferenceDescriptions;
    },
  });
};
