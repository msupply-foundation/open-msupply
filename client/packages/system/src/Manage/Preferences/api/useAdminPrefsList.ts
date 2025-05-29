import { PreferenceNodeType, useQuery } from '@openmsupply-client/common';
import { usePreferencesGraphQL } from './usePreferencesGraphQL';
import { PREFERENCES } from './keys';

export const useAdminPrefsList = (
  prefType: PreferenceNodeType,
  storeId?: string
) => {
  const { api, storeId: loggedInStoreId } = usePreferencesGraphQL();

  return useQuery({
    queryKey: [PREFERENCES, prefType, storeId],
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
