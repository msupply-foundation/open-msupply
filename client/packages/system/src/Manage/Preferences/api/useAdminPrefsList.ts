import { PreferenceNodeType, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCE_DESCRIPTIONS } from './keys';

export const useAdminPrefsList = (
  prefType: PreferenceNodeType,
  storeId?: string
) => {
  const { api, storeId: loggedInStoreId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: [PREFERENCE_DESCRIPTIONS, prefType, storeId],
    queryFn: async () => {
      const result = await api.adminPreferenceList({
        storeId: loggedInStoreId,
        prefType,
        prefContext: {
          storeId,
        },
      });

      return result.preferenceDescriptions;
    },
  });
};
